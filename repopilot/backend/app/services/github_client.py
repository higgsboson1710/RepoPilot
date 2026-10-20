import base64
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse
import httpx
from app.config import settings

# Directories and extensions that waste LLM tokens and add zero architectural value
IGNORED_DIRS = {
    "node_modules", ".git", ".github", "__pycache__", "dist", "build",
    ".next", ".nuxt", "venv", ".venv", "env", "coverage", ".idea", ".vscode",
    "vendor", "target", "out", ".pytest_cache", ".mypy_cache",
}

IGNORED_EXTENSIONS = {
    ".lock", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".woff",
    ".woff2", ".ttf", ".eot", ".mp4", ".mp3", ".pdf", ".zip", ".tar",
    ".gz", ".pyc", ".pyo", ".so", ".dll", ".exe", ".bin", ".min.js", ".min.css",
}

IGNORED_FILENAMES = {
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock",
    "Pipfile.lock", "composer.lock", "Gemfile.lock", "cargo.lock",
}


class GitHubClient:
    """Async GitHub REST API client with automatic noise filtering and surgical file reading."""

    BASE_URL = "https://api.github.com"

    def __init__(self, github_token: Optional[str] = None):
        raw_token = github_token or settings.GITHUB_TOKEN or ''
        token = ''.join(c for c in raw_token if c.isalnum() or c == '_')
        self.headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "RepoPilot-Agent",
        }
        if token and token.startswith("ghp_"):
            self.headers["Authorization"] = f"Bearer {token}"

    @staticmethod
    def parse_repo_url(repo_url: str) -> Tuple[str, str]:
        """Extracts (owner, repo) from any GitHub URL or 'owner/repo' string."""
        cleaned = repo_url.strip().rstrip("/")
        if cleaned.endswith(".git"):
            cleaned = cleaned[:-4]
        if "github.com" in cleaned:
            parts = [p for p in urlparse(cleaned).path.split("/") if p]
            if len(parts) >= 2:
                return parts[0], parts[1]
        parts = [p for p in cleaned.split("/") if p]
        if len(parts) == 2:
            return parts[0], parts[1]
        raise ValueError(f"Invalid GitHub repository URL or identifier: {repo_url}")

    @staticmethod
    def is_noise_path(filepath: str) -> bool:
        """Returns True if a file path belongs to ignored directories, lockfiles, or binaries."""
        parts = filepath.split("/")
        if any(part in IGNORED_DIRS for part in parts):
            return True
        filename = parts[-1]
        if filename in IGNORED_FILENAMES:
            return True
        lower_name = filename.lower()
        return any(lower_name.endswith(ext) for ext in IGNORED_EXTENSIONS)

    async def get_repo_overview(self, owner: str, repo: str) -> Dict[str, Any]:
        """Fetches core metadata, default branch, latest commit SHA, and language breakdown."""
        async with httpx.AsyncClient(headers=self.headers, timeout=20.0, follow_redirects=True) as client:
            repo_resp = await client.get(f"{self.BASE_URL}/repos/{owner}/{repo}")
            repo_resp.raise_for_status()
            repo_data = repo_resp.json()

            default_branch = repo_data.get("default_branch", "main")

            # Fetch latest commit SHA on default branch (used for 0-token Commit-SHA caching)
            branch_resp = await client.get(
                f"{self.BASE_URL}/repos/{owner}/{repo}/branches/{default_branch}"
            )
            branch_resp.raise_for_status()
            commit_sha = branch_resp.json()["commit"]["sha"]

            # Fetch language byte breakdown
            lang_resp = await client.get(f"{self.BASE_URL}/repos/{owner}/{repo}/languages")
            languages = lang_resp.json() if lang_resp.status_code == 200 else {}

            return {
                "owner": owner,
                "repo": repo,
                "full_name": repo_data.get("full_name"),
                "description": repo_data.get("description") or "No description provided.",
                "stars": repo_data.get("stargazers_count", 0),
                "forks": repo_data.get("forks_count", 0),
                "open_issues_count": repo_data.get("open_issues_count", 0),
                "default_branch": default_branch,
                "latest_commit_sha": commit_sha,
                "languages": languages,
                "topics": repo_data.get("topics", []),
            }

    async def get_clean_file_tree(
        self, owner: str, repo: str, branch_or_sha: str
    ) -> List[str]:
        """Fetches the entire recursive repository file tree and strips all non-code noise."""
        url = f"{self.BASE_URL}/repos/{owner}/{repo}/git/trees/{branch_or_sha}?recursive=1"
        async with httpx.AsyncClient(headers=self.headers, timeout=25.0, follow_redirects=True) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            tree_items = resp.json().get("tree", [])

        clean_paths: List[str] = []
        for item in tree_items:
            if item.get("type") == "blob":
                path = item.get("path", "")
                if path and not self.is_noise_path(path):
                    clean_paths.append(path)

        return clean_paths[: settings.MAX_TREE_FILES]

    async def get_raw_file(
        self, owner: str, repo: str, filepath: str, ref: Optional[str] = None
    ) -> Optional[str]:
        """Fetches and decodes a UTF-8 file from the repository. Returns None if not found."""
        url = f"{self.BASE_URL}/repos/{owner}/{repo}/contents/{filepath.lstrip('/')}"
        params = {"ref": ref} if ref else {}
        async with httpx.AsyncClient(headers=self.headers, timeout=20.0, follow_redirects=True) as client:
            resp = await client.get(url, params=params)
            if resp.status_code != 200:
                return None
            data = resp.json()
            if isinstance(data, dict) and data.get("encoding") == "base64":
                raw_bytes = base64.b64decode(data["content"])
                return raw_bytes.decode("utf-8", errors="replace")
        return None

    async def read_file_window(
        self,
        owner: str,
        repo: str,
        filepath: str,
        start_line: int = 1,
        end_line: int = 120,
        ref: Optional[str] = None,
    ) -> str:
        """
        Surgical file reader for the LangChain Tool-Calling Agent.
        Reads at most MAX_FILE_WINDOW_LINES lines with line numbers prefixed to save LLM tokens.
        """
        content = await self.get_raw_file(owner, repo, filepath, ref=ref)
        if content is None:
            return f"Error: File '{filepath}' not found in {owner}/{repo}."

        lines = content.splitlines()
        total_lines = len(lines)
        start_idx = max(1, start_line)
        max_end = min(total_lines, start_idx + settings.MAX_FILE_WINDOW_LINES - 1)
        end_idx = min(max_end, max(start_idx, end_line))

        numbered_slice = [
            f"{line_no:4d} | {lines[line_no - 1]}"
            for line_no in range(start_idx, end_idx + 1)
        ]
        header = f"--- {filepath} (Lines {start_idx}-{end_idx} of {total_lines}) ---"
        return "\n".join([header] + numbered_slice)

    async def get_open_issues(
        self, owner: str, repo: str, limit: int = 15
    ) -> List[Dict[str, Any]]:
        """Fetches open issues (excluding Pull Requests) for the Issue-to-PR Agent."""
        url = f"{self.BASE_URL}/repos/{owner}/{repo}/issues"
        params = {"state": "open", "per_page": min(limit * 2, 50)}
        async with httpx.AsyncClient(headers=self.headers, timeout=20.0, follow_redirects=True) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            items = resp.json()

        issues = []
        for item in items:
            # GitHub's /issues endpoint includes PRs; skip items with 'pull_request' key
            if "pull_request" in item:
                continue
            issues.append(
                {
                    "number": item["number"],
                    "title": item["title"],
                    "state": item["state"],
                    "labels": [lbl["name"] for lbl in item.get("labels", [])],
                    "created_at": item["created_at"],
                    "comments_count": item.get("comments", 0),
                    "body": (item.get("body") or "")[:1500],
                }
            )
            if len(issues) >= limit:
                break
        return issues

    async def get_issue_detail(
        self, owner: str, repo: str, issue_number: int
    ) -> Dict[str, Any]:
        """Fetches a specific issue and up to 8 maintainer/community comments."""
        async with httpx.AsyncClient(headers=self.headers, timeout=20.0, follow_redirects=True) as client:
            issue_resp = await client.get(
                f"{self.BASE_URL}/repos/{owner}/{repo}/issues/{issue_number}"
            )
            issue_resp.raise_for_status()
            issue_data = issue_resp.json()

            comments_resp = await client.get(
                f"{self.BASE_URL}/repos/{owner}/{repo}/issues/{issue_number}/comments",
                params={"per_page": 8},
            )
            comments_data = comments_resp.json() if comments_resp.status_code == 200 else []

        return {
            "number": issue_data["number"],
            "title": issue_data["title"],
            "labels": [lbl["name"] for lbl in issue_data.get("labels", [])],
            "body": (issue_data.get("body") or "No description.")[:2500],
            "comments": [
                {
                    "user": c.get("user", {}).get("login", "unknown"),
                    "body": (c.get("body") or "")[:800],
                }
                for c in comments_data
            ],
        }
