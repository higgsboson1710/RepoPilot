from typing import Optional
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from app.config import settings
from app.services.github_client import GitHubClient
from app.services.osv_scanner import DependencyAndCVEScanner
from app.langchain_engine.xray_chain import generate_repo_xray, generate_dependency_audit
from app.db.database import (
    get_cached_repo,
    save_cached_repo,
    verify_user_session,
    record_user_scan,
)

router = APIRouter()
gh = GitHubClient()
cve_scanner = DependencyAndCVEScanner()


class XRayRequest(BaseModel):
    repo_url: str


@router.post("/xray")
async def analyze_repository(
    payload: XRayRequest,
    authorization: Optional[str] = Header(default=None),
    x_user_email: Optional[str] = Header(default=None),
    x_user_groq_key: Optional[str] = Header(default=None),
    x_user_google_key: Optional[str] = Header(default=None),
):
    """
    POST /api/v1/xray:
    1. Verifies that the caller is signed in (Google OAuth or Email/Password) when REQUIRE_AUTH_FOR_SCANS=True.
    2. Increments the logged-in user's personal `scans_count` in the database.
    3. Checks Commit-SHA cache first (0 tokens, ~40ms latency).
    4. If cache miss, fetches clean tree, parses manifest, scans OSV.dev CVEs,
       runs LangChain structured X-Ray pipeline, caches result, and returns.
    """
    current_user = verify_user_session(authorization, x_user_email)
    if settings.REQUIRE_AUTH_FOR_SCANS and not current_user:
        raise HTTPException(
            status_code=401,
            detail="Authentication required: Please sign in or create an account to analyze repositories.",
        )

    try:
        owner, repo = gh.parse_repo_url(payload.repo_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Fetch latest metadata & commit SHA
    try:
        overview = await gh.get_repo_overview(owner, repo)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch repository: {str(e)}")

    commit_sha = overview["latest_commit_sha"]

    # Record scan under this discrete user's profile
    if current_user:
        record_user_scan(current_user["id"])

    # 0-Token Commit-SHA Cache Check
    cached = get_cached_repo(owner, repo, commit_sha)
    if cached:
        return {
            "cached": True,
            "overview": overview,
            "xray": cached["xray"],
            "dependencies": cached["dependencies"],
        }

    # Cache Miss: Fetch clean code tree & README
    clean_tree = await gh.get_clean_file_tree(owner, repo, commit_sha)
    readme_text = await gh.get_raw_file(owner, repo, "README.md", ref=commit_sha)

    # Run LangChain Structured Architecture X-Ray
    xray_output = await generate_repo_xray(
        overview=overview,
        clean_tree=clean_tree,
        readme_excerpt=readme_text or "",
        user_groq_key=x_user_groq_key,
        user_google_key=x_user_google_key,
    )
    xray_dict = xray_output.model_dump()

    # Parse dependencies from requirements.txt or package.json
    deps_list = []
    reqs_raw = await gh.get_raw_file(owner, repo, "requirements.txt", ref=commit_sha)
    pkg_raw = await gh.get_raw_file(owner, repo, "package.json", ref=commit_sha)

    if reqs_raw:
        deps_list.extend(cve_scanner.parse_requirements_txt(reqs_raw))
    if pkg_raw:
        deps_list.extend(cve_scanner.parse_package_json(pkg_raw))

    # Scan live CVEs via Google OSV.dev batch API (0 tokens)
    cve_enriched = await cve_scanner.scan_dependencies_with_osv(deps_list[:35])

    # Run LangChain Dependency Categorization & Security Advisor
    deps_audit = await generate_dependency_audit(
        repo_full_name=overview["full_name"],
        osv_enriched_deps=cve_enriched,
        user_groq_key=x_user_groq_key,
        user_google_key=x_user_google_key,
    )
    deps_dict = deps_audit.model_dump()
    deps_dict["raw_osv_results"] = cve_enriched

    # Save to permanent Commit-SHA cache for future 0-token instant reads
    save_cached_repo(owner, repo, commit_sha, xray_dict, deps_dict)

    return {
        "cached": False,
        "overview": overview,
        "xray": xray_dict,
        "dependencies": deps_dict,
    }


@router.get("/issues")
async def list_open_issues(repo_url: str):
    """GET /api/v1/issues: Lists open GitHub issues for user selection in the UI."""
    try:
        owner, repo = gh.parse_repo_url(repo_url)
        issues = await gh.get_open_issues(owner, repo, limit=15)
        return {"owner": owner, "repo": repo, "issues": issues}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
