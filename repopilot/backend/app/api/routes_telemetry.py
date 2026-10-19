from fastapi import APIRouter
from app.db.database import get_telemetry_stats

router = APIRouter()


@router.get("/stats")
async def get_stats():
    """
    GET /api/v1/stats:
    Returns live counters for discrete registered users, total analyses, unique repos,
    issues solved, active database storage engine ('postgresql_permanent' vs 'sqlite_local'),
    and the recent registered user roster.
    """
    stats = get_telemetry_stats()
    return {
        "status": "online",
        "storage_engine": stats.get("storage_engine", "sqlite_local"),
        "registered_users": stats.get("registered_users", 0),
        "total_analyses": stats.get("total_analyses", 0),
        "unique_repos": stats.get("unique_repos", 0),
        "issues_solved": stats.get("issues_solved", 0),
        "recent_users": stats.get("recent_users", []),
    }
