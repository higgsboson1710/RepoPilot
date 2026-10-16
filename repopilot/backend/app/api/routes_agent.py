import json
from typing import Optional
from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.services.github_client import GitHubClient
from app.langchain_engine.issue_agent import run_issue_solver_agent
from app.db.database import increment_issues_solved

router = APIRouter()
gh = GitHubClient()


class IssueSolveRequest(BaseModel):
    repo_url: str
    query: str


@router.post("/solve-issue")
async def solve_issue_stream(
    payload: IssueSolveRequest,
    x_user_groq_key: Optional[str] = Header(default=None),
    x_user_google_key: Optional[str] = Header(default=None),
):
    """
    POST /api/v1/solve-issue:
    Executes the LangChain Tool-Calling Agent and streams live Server-Sent Events (SSE)
    to the frontend so the React UI can display the agent's live tool trace in real time.
    """
    try:
        owner, repo = gh.parse_repo_url(payload.repo_url)
        overview = await gh.get_repo_overview(owner, repo)
        clean_tree = await gh.get_clean_file_tree(owner, repo, overview["latest_commit_sha"])
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    async def event_generator():
        # Yield initial status event
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

        # Stream each tool step to the client
        for idx, step in enumerate(result.get("tool_trace", []), 1):
            yield f"data: {json.dumps({'type': '

The previous response was interrupted by a network blip. Here is the complete command to save [`repopilot/backend/app/api/routes_agent.py`](file:///C:/Users/BIT/Desktop/Projects/Langchain%20project/repopilot/backend/app/api/routes_agent.py):

```powershell
$target = if (Test-Path "app") { "app\api\routes_agent.py" } else { "repopilot\backend\app\api\routes_agent.py" }
@'
import json
from typing import Optional
from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.services.github_client import GitHubClient
from app.langchain_engine.issue_agent import run_issue_solver_agent
from app.db.database import increment_issues_solved

router = APIRouter()
gh = GitHubClient()


class IssueSolveRequest(BaseModel):
    repo_url: str
    query: str


@router.post("/solve-issue")
async def solve_issue_stream(
    payload: IssueSolveRequest,
    x_user_groq_key: Optional[str] = Header(default=None),
    x_user_google_key: Optional[str] = Header(default=None),
):
    """
    POST /api/v1/solve-issue:
    Executes the LangChain Tool-Calling Agent and streams live Server-Sent Events (SSE)
    to the frontend so the React UI can display the agent's live tool trace in real time.
    """
    try:
        owner, repo = gh.parse_repo_url(payload.repo_url)
        overview = await gh.get_repo_overview(owner, repo)
        clean_tree = await gh.get_clean_file_tree(owner, repo, overview["latest_commit_sha"])
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    async def event_generator():
        # Yield initial status event
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

        # Stream each tool step to the client
        for idx, step in enumerate(result.get("tool_trace", []), 1):
            yield f"data: {json.dumps({'type': 'tool_step', 'step_number': idx, 'tool': step['tool'], 'input': step['tool_input'], 'preview': step['observation_preview']})}\n\n"

        # Increment telemetry counter
        increment_issues_solved()

        # Yield final completed engineering report
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
