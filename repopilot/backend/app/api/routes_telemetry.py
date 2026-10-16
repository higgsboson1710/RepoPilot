from fastapi import APIRouter
from app.db.database import get_telemetry_stats

router = APIRouter()


@router.get("/stats")
async def get_stats():
    """
    GET /api/v1/stats:
    Returns live counters for total analyses, unique repos, and issues solved.
    Used by the React landing page to show real user metrics for your resume!
    """
    stats = get_telemetry_stats()
    return {
        "status": "online",
        "total_analyses": stats.get("total_analyses", 0),
        "unique_repos": stats.get("unique_repos", 0),
        "issues_solved": stats.get("issues_solved", 0),
    }
