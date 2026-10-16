import json
import sqlite3
from typing import Any, Dict, Optional
from app.config import settings


def get_db_connection() -> sqlite3.Connection:
    """Returns a connection to the local SQLite database with row factory enabled."""
    conn = sqlite3.connect(settings.SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_database():
    """Initializes SQLite tables for 0-token Commit-SHA caching and resume telemetry metrics."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Commit-SHA Cache table: stores repo X-Ray and Dependency Matrix by {owner}/{repo}@{commit_sha}
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

    # Telemetry metrics table for live resume user counters
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS telemetry (
            metric_name TEXT PRIMARY KEY,
            metric_count INTEGER DEFAULT 0
        )
        """
    )

    # Seed initial telemetry metrics if they don't exist
    for metric in ("total_analyses", "unique_repos", "issues_solved"):
        cursor.execute(
            "INSERT OR IGNORE INTO telemetry (metric_name, metric_count) VALUES (?, 0)",
            (metric,),
        )

    conn.commit()
    conn.close()


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

    # Increment telemetry counters
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
