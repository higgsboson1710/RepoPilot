import hashlib
import json
import secrets
import sqlite3
from typing import Any, Dict, List, Optional
from app.config import settings

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    psycopg2 = None
    RealDictCursor = None


def is_postgres_enabled() -> bool:
    """Returns True if a permanent cloud PostgreSQL DATABASE_URL is configured."""
    url = (settings.DATABASE_URL or "").strip()
    return bool(url and (url.startswith("postgres://") or url.startswith("postgresql://")))


def _normalize_pg_url(url: str) -> str:
    if url.startswith("postgres://"):
        return "postgresql://" + url[len("postgres://"):]
    return url


class _DBSession:
    """
    Unified database adapter that supports BOTH:
      1. Permanent Cloud PostgreSQL (`DATABASE_URL` from Neon.tech / Supabase / Render)
      2. Local SQLite (`repopilot_cache.db`) for zero-config local development
    Automatically translates `?` parameter placeholders to `%s` when using PostgreSQL.
    """

    def __init__(self):
        self.is_pg = is_postgres_enabled()
        if self.is_pg:
            if psycopg2 is None:
                raise RuntimeError("psycopg2-binary is required when DATABASE_URL is set.")
            self.conn = psycopg2.connect(
                _normalize_pg_url(settings.DATABASE_URL.strip()),
                cursor_factory=RealDictCursor,
            )
        else:
            self.conn = sqlite3.connect(settings.SQLITE_DB_PATH)
            self.conn.row_factory = sqlite3.Row
        self.cursor = self.conn.cursor()

    def execute(self, sql: str, params: tuple = ()):
        if self.is_pg:
            sql = sql.replace("?", "%s")
        self.cursor.execute(sql, params)
        return self.cursor

    def fetchone(self) -> Optional[Dict[str, Any]]:
        row = self.cursor.fetchone()
        return dict(row) if row else None

    def fetchall(self) -> List[Dict[str, Any]]:
        rows = self.cursor.fetchall()
        return [dict(r) for r in rows]

    def commit(self):
        self.conn.commit()

    def close(self):
        try:
            self.cursor.close()
        except Exception:
            pass
        self.conn.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is None:
            self.commit()
        self.close()


def init_database():
    """
    Initializes permanent tables for discrete Users (Google + Email Auth), per-user scan tracking,
    0-token Commit-SHA cache, and global telemetry counters.
    Works seamlessly on both Cloud PostgreSQL (`DATABASE_URL`) and local SQLite.
    """
    with _DBSession() as db:
        if db.is_pg:
            db.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    avatar_url TEXT,
                    auth_provider TEXT NOT NULL DEFAULT 'email',
                    password_hash TEXT,
                    session_token TEXT,
                    scans_count INTEGER NOT NULL DEFAULT 0,
                    issues_solved_count INTEGER NOT NULL DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        else:
            db.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    avatar_url TEXT,
                    auth_provider TEXT NOT NULL DEFAULT 'email',
                    password_hash TEXT,
                    session_token TEXT,
                    scans_count INTEGER NOT NULL DEFAULT 0,
                    issues_solved_count INTEGER NOT NULL DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            # Safe migration for existing local SQLite databases
            for col_sql in (
                "ALTER TABLE users ADD COLUMN scans_count INTEGER NOT NULL DEFAULT 0",
                "ALTER TABLE users ADD COLUMN issues_solved_count INTEGER NOT NULL DEFAULT 0",
                "ALTER TABLE users ADD COLUMN last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
            ):
                try:
                    db.execute(col_sql)
                except Exception:
                    pass

        db.execute(
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

        db.execute(
            """
            CREATE TABLE IF NOT EXISTS telemetry (
                metric_name TEXT PRIMARY KEY,
                metric_count INTEGER DEFAULT 0
            )
            """
        )

        for metric in ("total_analyses", "unique_repos", "issues_solved", "registered_users"):
            if db.is_pg:
                db.execute(
                    """
                    INSERT INTO telemetry (metric_name, metric_count)
                    VALUES (?, 0)
                    ON CONFLICT (metric_name) DO NOTHING
                    """,
                    (metric,),
                )
            else:
                db.execute(
                    "INSERT OR IGNORE INTO telemetry (metric_name, metric_count) VALUES (?, 0)",
                    (metric,),
                )


def _hash_password(password: str, salt: Optional[str] = None) -> str:
    """Hashes a password using built-in PBKDF2-HMAC-SHA256."""
    salt_str = salt or secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt_str.encode("utf-8"), 100_000)
    return f"{salt_str}${dk.hex()}"


def _verify_password(password: str, stored_hash: str) -> bool:
    """Verifies a plaintext password against a stored salt$hash string."""
    if not stored_hash or "$" not in stored_hash:
        return False
    salt_str, _ = stored_hash.split("$", 1)
    return secrets.compare_digest(_hash_password(password, salt_str), stored_hash)


def _sync_registered_users_count(db: _DBSession):
    db.execute("SELECT COUNT(*) as cnt FROM users")
    row = db.fetchone()
    user_count = int(row["cnt"]) if row else 0
    db.execute(
        "UPDATE telemetry SET metric_count = ? WHERE metric_name = 'registered_users'",
        (user_count,),
    )


def create_or_login_google_user(email: str, name: str, avatar_url: str = "") -> Dict[str, Any]:
    """Creates or logs in a discrete user via Google Sign-In and issues a persistent session token."""
    clean_email = email.strip().lower()
    token = secrets.token_urlsafe(32)

    with _DBSession() as db:
        db.execute("SELECT * FROM users WHERE email = ?", (clean_email,))
        existing = db.fetchone()

        if existing:
            db.execute(
                """
                UPDATE users
                SET name = ?, avatar_url = ?, session_token = ?, last_active_at = CURRENT_TIMESTAMP
                WHERE email = ?
                """,
                (name, avatar_url or existing.get("avatar_url", ""), token, clean_email),
            )
        else:
            db.execute(
                """
                INSERT INTO users (email, name, avatar_url, auth_provider, session_token)
                VALUES (?, ?, ?, 'google', ?)
                """,
                (clean_email, name, avatar_url, token),
            )

        _sync_registered_users_count(db)
        db.execute(
            """
            SELECT id, email, name, avatar_url, auth_provider, scans_count, issues_solved_count, created_at
            FROM users WHERE email = ?
            """,
            (clean_email,),
        )
        user_row = db.fetchone()

    return {"token": token, "user": user_row}


def register_email_user(email: str, name: str, password: str) -> Dict[str, Any]:
    """Registers a new discrete user with email and password."""
    clean_email = email.strip().lower()
    token = secrets.token_urlsafe(32)
    pw_hash = _hash_password(password)

    with _DBSession() as db:
        db.execute("SELECT id FROM users WHERE email = ?", (clean_email,))
        if db.fetchone():
            raise ValueError("An account with this email already exists. Please sign in.")

        avatar = f"https://api.dicebear.com/7.x/initials/svg?seed={name.replace(' ', '+')}"
        db.execute(
            """
            INSERT INTO users (email, name, avatar_url, auth_provider, password_hash, session_token)
            VALUES (?, ?, ?, 'email', ?, ?)
            """,
            (clean_email, name.strip(), avatar, pw_hash, token),
        )

        _sync_registered_users_count(db)
        db.execute(
            """
            SELECT id, email, name, avatar_url, auth_provider, scans_count, issues_solved_count, created_at
            FROM users WHERE email = ?
            """,
            (clean_email,),
        )
        user_row = db.fetchone()

    return {"token": token, "user": user_row}


def authenticate_email_user(email: str, password: str) -> Dict[str, Any]:
    """Authenticates an existing email/password user and issues a fresh session token."""
    clean_email = email.strip().lower()

    with _DBSession() as db:
        db.execute("SELECT * FROM users WHERE email = ?", (clean_email,))
        row = db.fetchone()

        if not row:
            raise ValueError("No account found with that email address.")

        if row["auth_provider"] == "google" and not row.get("password_hash"):
            raise ValueError("This email is linked with Google Sign-In. Please click 'Continue with Google'.")

        if not _verify_password(password, row.get("password_hash") or ""):
            raise ValueError("Invalid password. Please try again.")

        token = secrets.token_urlsafe(32)
        db.execute(
            "UPDATE users SET session_token = ?, last_active_at = CURRENT_TIMESTAMP WHERE id = ?",
            (token, row["id"]),
        )

        user_dict = {
            "id": row["id"],
            "email": row["email"],
            "name": row["name"],
            "avatar_url": row["avatar_url"],
            "auth_provider": row["auth_provider"],
            "scans_count": row.get("scans_count", 0),
            "issues_solved_count": row.get("issues_solved_count", 0),
            "created_at": row["created_at"],
        }

    return {"token": token, "user": user_dict}


def verify_user_session(
    authorization_header: Optional[str] = None,
    user_email_header: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Verifies that a request comes from a registered, signed-in user.
    Checks `Authorization: Bearer <session_token>` first, with fallback to registered `X-User-Email`.
    """
    token = None
    if authorization_header and authorization_header.lower().startswith("bearer "):
        token = authorization_header.split(" ", 1)[1].strip()

    with _DBSession() as db:
        if token:
            db.execute(
                """
                SELECT id, email, name, avatar_url, auth_provider, scans_count, issues_solved_count
                FROM users WHERE session_token = ?
                """,
                (token,),
            )
            user = db.fetchone()
            if user:
                return user

        if user_email_header:
            clean_email = user_email_header.strip().lower()
            db.execute(
                """
                SELECT id, email, name, avatar_url, auth_provider, scans_count, issues_solved_count
                FROM users WHERE email = ?
                """,
                (clean_email,),
            )
            user = db.fetchone()
            if user:
                return user

    return None


def record_user_scan(user_id: Optional[int]):
    """Increments the specific logged-in user's personal scan count and updates last_active_at."""
    if not user_id:
        return
    with _DBSession() as db:
        db.execute(
            """
            UPDATE users
            SET scans_count = scans_count + 1, last_active_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (user_id,),
        )


def get_cached_repo(owner: str, repo: str, commit_sha: str) -> Optional[Dict[str, Any]]:
    """Checks if {owner}/{repo}@{commit_sha} was already analyzed. Returns None if uncached."""
    cache_key = f"{owner.lower()}/{repo.lower()}@{commit_sha}"
    with _DBSession() as db:
        db.execute("SELECT xray_data, deps_data FROM repo_cache WHERE cache_key = ?", (cache_key,))
        row = db.fetchone()

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
    """Saves a fresh analysis keyed by Commit-SHA and increments permanent telemetry."""
    cache_key = f"{owner.lower()}/{repo.lower()}@{commit_sha}"
    with _DBSession() as db:
        if db.is_pg:
            db.execute(
                """
                INSERT INTO repo_cache (cache_key, owner, repo, commit_sha, xray_data, deps_data)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT (cache_key) DO UPDATE SET
                    commit_sha = EXCLUDED.commit_sha,
                    xray_data = EXCLUDED.xray_data,
                    deps_data = EXCLUDED.deps_data
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
        else:
            db.execute(
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

        db.execute("UPDATE telemetry SET metric_count = metric_count + 1 WHERE metric_name = 'total_analyses'")
        db.execute("SELECT COUNT(DISTINCT owner || '/' || repo) as count FROM repo_cache")
        unique_row = db.fetchone()
        unique_count = int(unique_row["count"]) if unique_row else 0
        db.execute(
            "UPDATE telemetry SET metric_count = ? WHERE metric_name = 'unique_repos'",
            (unique_count,),
        )


def increment_issues_solved(user_id: Optional[int] = None):
    """Increments global issues_solved counter AND the specific logged-in user's issues_solved_count."""
    with _DBSession() as db:
        db.execute("UPDATE telemetry SET metric_count = metric_count + 1 WHERE metric_name = 'issues_solved'")
        if user_id:
            db.execute(
                """
                UPDATE users
                SET issues_solved_count = issues_solved_count + 1, last_active_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (user_id,),
            )


def get_telemetry_stats() -> Dict[str, Any]:
    """Returns real-time analytics AND discrete registered user roster."""
    with _DBSession() as db:
        db.execute("SELECT metric_name, metric_count FROM telemetry")
        rows = db.fetchall()
        metrics = {row["metric_name"]: int(row["metric_count"]) for row in rows}

        # Always compute exact discrete registered user count directly from `users` table
        db.execute("SELECT COUNT(*) as cnt FROM users")
        cnt_row = db.fetchone()
        metrics["registered_users"] = int(cnt_row["cnt"]) if cnt_row else 0

        # Fetch the most recent discrete registered users for live tracking
        db.execute(
            """
            SELECT id, name, email, avatar_url, auth_provider, scans_count, issues_solved_count, created_at
            FROM users
            ORDER BY id DESC
            LIMIT 10
            """
        )
        recent_users = db.fetchall()

    return {
        **metrics,
        "storage_engine": "postgresql_permanent" if is_postgres_enabled() else "sqlite_local",
        "recent_users": recent_users,
    }
