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


@router.get('/test-groq')
async def test_groq():
    import httpx, traceback
    from app.config import settings
    results = {
        'settings_groq_key_len': len(settings.GROQ_API_KEY) if settings.GROQ_API_KEY else 0,
        'settings_groq_prefix': settings.GROQ_API_KEY[:6] if settings.GROQ_API_KEY else '',
        'settings_google_key_len': len(settings.GOOGLE_API_KEY) if settings.GOOGLE_API_KEY else 0,
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get('https://api.groq.com/openai/v1/models')
            results['groq_http_status'] = resp.status_code
    except Exception as e:
        results['groq_http_error'] = f'{type(e).__name__}: {e}'

    if settings.GROQ_API_KEY:
        try:
            from langchain_groq import ChatGroq
            cg = ChatGroq(model='openai/gpt-oss-120b', api_key=settings.GROQ_API_KEY, timeout=15)
            ans = await cg.ainvoke('test ping')
            results['chatgroq_ping'] = ans.content[:40]
        except Exception as e:
            results['chatgroq_error'] = f'{type(e).__name__}: {e}'

    return results
