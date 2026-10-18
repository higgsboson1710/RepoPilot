import hashlib
import json
import secrets
import sqlite3
from typing import Any, Dict, Optional
from app.config import settings


def get_db_connection() -> sqlite3.Connection:
    """Returns a connection to the local SQLite database with row factory enabled."""
    conn = sqlite3.connect(settings.SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_database():
    """Initializes SQLite tables for Users (Google + Email Auth), 0-token Commit-SHA cache, and telemetry."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Users table for Google OAuth & Email/Password Authentication
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            avatar_url TEXT,
            auth_provider TEXT NOT NULL DEFAULT 'email',
            password_hash TEXT,
            session_token TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    # 2. Commit-SHA Cache table: stores repo X-Ray and Dependency Matrix by {owner}/{repo}@{commit_sha}
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS repo_cache (
            cache_key TEXT PRIMARY KEY,
            owner TEXT NOT NULL,
            repo TEXT NOT NULL,
            commit_sha TEXT NOT NULL,
            xray_data TEXT NOT NULL,
            deps_data TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    # 3. Telemetry metrics table for live resume user counters
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS telemetry (
            metric_name TEXT PRIMARY KEY,
            metric_count INTEGER DEFAULT 0
        )
        """
    )

    # Seed initial telemetry metrics if they don't exist
    for metric in ("total_analyses", "unique_repos", "issues_solved", "registered_users"):
        cursor.execute(
            "INSERT OR IGNORE INTO telemetry (metric_name, metric_count) VALUES (?, 0)",
            (metric,),
        )

    conn.commit()
    conn.close()


def _hash_password(password: str, salt: Optional[str] = None) -> str:
    """Hashes a password using built-in PBKDF2-HMAC-SHA256 (zero external dependencies)."""
    salt_str = salt or secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt_str.encode("utf-8"), 100_000)
    return f"{salt_str}${dk.hex()}"


def _verify_password(password: str, stored_hash: str) -> bool:
    """Verifies a plaintext password against a stored salt$hash string."""
    if not stored_hash or "$" not in stored_hash:
        return False
    salt_str, _ = stored_hash.split("$", 1)
    return secrets.compare_digest(_hash_password(password, salt_str), stored_hash)


def create_or_login_google_user(email: str, name: str, avatar_url: str = "") -> Dict[str, Any]:
    """Creates or logs in a user via Google Sign-In and issues a fresh session token."""
    clean_email = email.strip().lower()
    token = secrets.token_urlsafe(32)
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM users WHERE email = ?", (clean_email,))
    existing = cursor.fetchone()

    if existing:
        cursor.execute(
            "UPDATE users SET name = ?, avatar_url = ?, session_token = ? WHERE email = ?",
            (name, avatar_url or existing["avatar_url"], token, clean_email),
        )
    else:
        cursor.execute(
            """
            INSERT INTO users (email, name, avatar_url, auth_provider, session_token)
            VALUES (?, ?, ?, 'google', ?)
            """,
            (clean_email, name, avatar_url, token),
        )

    cursor.execute("SELECT COUNT(*) as cnt FROM users")
    user_count = cursor.fetchone()["cnt"]
    cursor.execute(
        "UPDATE telemetry SET metric_count = ? WHERE metric_name = 'registered_users'",
        (user_count,),
    )

    conn.commit()
    cursor.execute("SELECT id, email, name, avatar_url, auth_provider, created_at FROM users WHERE email = ?", (clean_email,))
    user_row = dict(cursor.fetchone())
    conn.close()
    return {"token": token, "user": user_row}


def register_email_user(email: str, name: str, password: str) -> Dict[str, Any]:
    """Registers a new user with email and password."""
    clean_email = email.strip().lower()
    token = secrets.token_urlsafe(32)
    pw_hash = _hash_password(password)

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM users WHERE email = ?", (clean_email,))
    if cursor.fetchone():
        conn.close()
        raise ValueError("An account with this email already exists. Please sign in.")

    avatar = f"https://api.dicebear.com/7.x/initials/svg?seed={name.replace(' ', '+')}"
    cursor.execute(
        """
        INSERT INTO users (email, name, avatar_url, auth_provider, password_hash, session_token)
        VALUES (?, ?, ?, 'email', ?, ?)
        """,
        (clean_email, name.strip(), avatar, pw_hash, token),
    )

    cursor.execute("SELECT COUNT(*) as cnt FROM users")
    user_count = cursor.fetchone()["cnt"]
    cursor.execute(
        "UPDATE telemetry SET metric_count = ? WHERE metric_name = 'registered_users'",
        (user_count,),
    )

    conn.commit()
    cursor.execute("SELECT id, email, name, avatar_url, auth_provider, created_at FROM users WHERE email = ?", (clean_email,))
    user_row = dict(cursor.fetchone())
    conn.close()
    return {"token": token, "user": user_row}


def authenticate_email_user(email: str, password: str) -> Dict[str, Any]:
    """Authenticates an existing email/password user."""
    clean_email = email.strip().lower()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (clean_email,))
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise ValueError("No account found with that email address.")

    if row["auth_provider"] == "google" and not row["password_hash"]:
        conn.close()
        raise ValueError("This email is linked with Google Sign-In. Please click 'Continue with Google'.")

    if not _verify_password(password, row["password_hash"] or ""):
        conn.close()
        raise ValueError("Invalid password. Please try again.")

    token = secrets.token_urlsafe(32)
    cursor.execute("UPDATE users SET session_token = ? WHERE id = ?", (token, row["id"]))
    conn.commit()

    user_dict = {
        "id": row["id"],
        "email": row["email"],
        "name": row["name"],
        "avatar_url": row["avatar_url"],
        "auth_provider": row["auth_provider"],
        "created_at": row["created_at"],
    }
    conn.close()
    return {"token": token, "user": user_dict}


def get_cached_repo(owner: str, repo: str, commit_sha: str) -> Optional[Dict[str, Any]]:
    """Checks if {owner}/{repo}@{commit_sha} was already analyzed. Returns None if uncached."""
    cache_key = f"{owner.lower()}/{repo.lower()}@{commit_sha}"
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT xray_data, deps_data FROM repo_cache WHERE cache_key = ?", (cache_key,))
    row = cursor.fetchone()
    conn.close()

    if row:
        return {
            "cached": True,
            "xray": json.loads(row["xray_data"]),
            "dependencies": json.loads(row["deps_data"]),
        }
    return None


def save_cached_repo(
    owner: str, repo: str, commit_sha: str, xray_data: Dict[str, Any], deps_data: Dict[str, Any]
):
    """Saves a fresh analysis into SQLite keyed by Commit-SHA and increments analytics."""
    cache_key = f"{owner.lower()}/{repo.lower()}@{commit_sha}"
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        INSERT OR REPLACE INTO repo_cache (cache_key, owner, repo, commit_sha, xray_data, deps_data)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            cache_key,
            owner,
            repo,
            commit_sha,
            json.dumps(xray_data),
            json.dumps(deps_data),
        ),
    )

    cursor.execute("UPDATE telemetry SET metric_count = metric_count + 1 WHERE metric_name = 'total_analyses'")
    cursor.execute("SELECT COUNT(DISTINCT owner || '/' || repo) as count FROM repo_cache")
    unique_count = cursor.fetchone()["count"]
    cursor.execute(
        "UPDATE telemetry SET metric_count = ? WHERE metric_name = 'unique_repos'",
        (unique_count,),
    )

    conn.commit()
    conn.close()


def increment_issues_solved():
    """Increments the issues_solved counter for resume metrics."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE telemetry SET metric_count = metric_count + 1 WHERE metric_name = 'issues_solved'")
    conn.commit()
    conn.close()


def get_telemetry_stats() -> Dict[str, int]:
    """Returns real-time analytics for the live resume counter."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT metric_name, metric_count FROM telemetry")
    rows = cursor.fetchall()
    conn.close()
    return {row["metric_name"]: row["metric_count"] for row in rows}
