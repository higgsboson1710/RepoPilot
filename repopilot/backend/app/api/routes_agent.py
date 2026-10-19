import json
from typing import Optional
from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.config import settings
from app.services.github_client import GitHubClient
from app.langchain_engine.issue_agent import run_issue_solver_agent
from app.db.database import increment_issues_solved, verify_user_session

router = APIRouter()
gh = GitHubClient()


class IssueSolveRequest(BaseModel):
    repo_url: str
    query: str


@router.post("/solve-issue")
async def solve_issue_stream(
    payload: IssueSolveRequest,
    authorization: Optional[str] = Header(default=None),
    x_user_email: Optional[str] = Header(default=None),
    x_user_groq_key: Optional[str] = Header(default=None),
    x_user_google_key: Optional[str] = Header(default=None),
):
    """
    POST /api/v1/solve-issue:
    1. Verifies that the caller is signed in when REQUIRE_AUTH_FOR_SCANS=True.
    2. Executes the LangChain Tool-Calling Agent and streams live Server-Sent Events (SSE).
    3. Increments both the global `issues_solved` counter and the logged-in user's personal counter.
    """
    current_user = verify_user_session(authorization, x_user_email)
    if settings.REQUIRE_AUTH_FOR_SCANS and not current_user:
        raise HTTPException(
            status_code=401,
            detail="Authentication required: Please sign in or create an account to dispatch the Issue-to-PR Agent.",
        )

    try:
        owner, repo = gh.parse_repo_url(payload.repo_url)
        overview = await gh.get_repo_overview(owner, repo)
        clean_tree = await gh.get_clean_file_tree(owner, repo, overview["latest_commit_sha"])
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    user_id = current_user["id"] if current_user else None

    async def event_generator():
        yield f"data: {json.dumps({'type': 'status', 'message': f'Initializing agent on {owner}/{repo}...'})}\n\n"

        result = await run_issue_solver_agent(
            owner=owner,
            repo=repo,
            commit_sha=overview["latest_commit_sha"],
            clean_tree=clean_tree,
            user_query=payload.query,
            user_groq_key=x_user_groq_key,
            user_google_key=x_user_google_key,
        )

        for idx, step in enumerate(result.get("tool_trace", []), 1):
            yield f"data: {json.dumps({'type': 'tool_step', 'step_number': idx, 'tool': step['tool'], 'input': step['tool_input'], 'preview': step['observation_preview']})}\n\n"

        increment_issues_solved(user_id=user_id)

        yield f"data: {json.dumps({'type': 'complete', 'answer': result.get('answer', '')})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
