from typing import Any, Dict, List, Optional
from langchain_core.tools import tool
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnablePassthrough
from langchain.agents import AgentExecutor
from langchain.agents.format_scratchpad.tools import format_to_tool_messages
from langchain.agents.output_parsers.tools import ToolsAgentOutputParser
from app.services.github_client import GitHubClient
from app.services.blast_radius import BlastRadiusAnalyzer
from app.langchain_engine.llm_router import get_resilient_llm_with_tools


ISSUE_AGENT_SYSTEM_PROMPT = """You are RepoPilot, an autonomous Staff Software Engineer Agent that investigates GitHub repositories and solves open issues.

You have 5 surgical tools bound to repository `{owner}/{repo}` (commit `{commit_sha}`):
1. `search_files_in_tree(keyword)` — Search ONLY for file paths/names in the repository tree (do NOT pass code snippets here).
2. `search_inside_file(filepath, code_query)` — Like Ctrl+F inside a file: returns the exact line numbers where a function, class, or variable (`def request`, `class Session`, `merge_cookies`) appears in `filepath`.
3. `read_code_window(filepath, start_line, end_line)` — Read a 150-line numbered slice of `filepath` around the line numbers you found.
4. `check_file_blast_radius(filepath)` — Find which other files in the repo import `filepath`.
5. `read_github_issue(issue_number)` — Fetch the full issue description and maintainer comments.

Strict Efficiency Rules (Complete your investigation in 3-5 tool calls):
- Always use `search_inside_file` BEFORE `read_code_window` on large files so you jump straight to the exact line number instead of scrolling from line 1.
- Never pass code like `def request` into `search_files_in_tree` (`search_files_in_tree` only matches file names).
- Once you have read the target function and checked the blast radius, immediately write your final engineering report covering:
  1. **Root Cause / Code Flow Analysis** (referencing exact file paths and line numbers)
  2. **Blast Radius & Impacted Files**
  3. **Step-by-Step Implementation Plan or Code Diff**
"""


def build_repo_tools(
    gh: GitHubClient,
    owner: str,
    repo: str,
    commit_sha: str,
    clean_tree: List[str],
):
    """Creates 5 LangChain @tool functions dynamically bound to the target GitHub repository."""

    @tool
    def search_files_in_tree(keyword: str) -> str:
        """Search ONLY repository file paths/filenames matching a keyword (e.g., 'sessions', 'auth', 'models'). Pass '' to list top files."""
        kw = keyword.strip().lower()
        if not kw:
            return "\n".join(clean_tree[:80])
        matches = [p for p in clean_tree if kw in p.lower()]
        if not matches:
            return (
                f"No file paths matched '{keyword}'. Note: this tool searches file names only. "
                f"To search for code/functions inside a file, use `search_inside_file`."
            )
        return "\n".join(matches[:50])

    @tool
    async def search_inside_file(filepath: str, code_query: str) -> str:
        """Search inside a specific file for a function, class, or keyword (e.g., 'def request', 'merge_cookies') and return matching line numbers."""
        content = await gh.get_raw_file(owner, repo, filepath, ref=commit_sha)
        if content is None:
            return f"Error: File '{filepath}' not found in {owner}/{repo}."

        needle = code_query.strip().lower()
        matches: List[str] = []
        for idx, line in enumerate(content.splitlines(), 1):
            if needle in line.lower():
                matches.append(f"Line {idx:4d}: {line.strip()}")
                if len(matches) >= 25:
                    break

        if not matches:
            return f"No occurrences of '{code_query}' found inside '{filepath}'."
        return (
            f"Matches for '{code_query}' in {filepath}:\n" + "\n".join(matches)
        )

    @tool
    async def read_code_window(
        filepath: str, start_line: int = 1, end_line: int = 120
    ) -> str:
        """Read a numbered window of lines (max 150 lines) from a file in the repository."""
        return await gh.read_file_window(
            owner, repo, filepath, start_line=start_line, end_line=end_line, ref=commit_sha
        )

    @tool
    async def check_file_blast_radius(filepath: str) -> str:
        """Check which sibling files in the same directory or package import `filepath`."""
        target_dir = "/".join(filepath.split("/")[:-1])
        ext = "." + filepath.split(".")[-1] if "." in filepath else ".py"
        candidate_files = [
            p for p in clean_tree if p.endswith(ext) and (not target_dir or p.startswith(target_dir))
        ][:15]

        repo_contents: Dict[str, str] = {}
        for path in candidate_files:
            raw = await gh.get_raw_file(owner, repo, path, ref=commit_sha)
            if raw:
                repo_contents[path] = raw

        dependents = BlastRadiusAnalyzer.find_downstream_dependents(filepath, repo_contents)
        if not dependents:
            return f"No direct importers of '{filepath}' found among {len(repo_contents)} sibling files."
        return f"Downstream files importing '{filepath}': {dependents}"

    @tool
    async def read_github_issue(issue_number: int) -> str:
        """Fetch the title, body, labels, and maintainer comments for a GitHub issue number."""
        detail = await gh.get_issue_detail(owner, repo, issue_number)
        return (
            f"Issue #{detail['number']}: {detail['title']}\n"
            f"Labels: {detail['labels']}\n"
            f"Body:\n{detail['body']}\n\n"
            f"Comments:\n{detail['comments']}"
        )

    return [
        search_files_in_tree,
        search_inside_file,
        read_code_window,
        check_file_blast_radius,
        read_github_issue,
    ]


async def run_issue_solver_agent(
    owner: str,
    repo: str,
    commit_sha: str,
    clean_tree: List[str],
    user_query: str,
    user_groq_key: Optional[str] = None,
    user_google_key: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Executes the LangChain Tool-Calling Agent with full multi-model fallback support
    and returns both the final markdown solution and the intermediate tool-call trace.
    """
    gh = GitHubClient()
    tools = build_repo_tools(gh, owner, repo, commit_sha, clean_tree)

    llm_with_tools = get_resilient_llm_with_tools(
        tools=tools,
        temperature=0.1,
        user_groq_key=user_groq_key,
        user_google_key=user_google_key,
    )

    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", ISSUE_AGENT_SYSTEM_PROMPT),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ]
    ).partial(owner=owner, repo=repo, commit_sha=commit_sha[:8])

    agent = (
        RunnablePassthrough.assign(
            agent_scratchpad=lambda x: format_to_tool_messages(x["intermediate_steps"])
        )
        | prompt
        | llm_with_tools
        | ToolsAgentOutputParser()
    )

    executor = AgentExecutor(
        agent=agent,
        tools=tools,
        verbose=True,
        max_iterations=10,
        return_intermediate_steps=True,
        handle_parsing_errors=True,
    )

    response = await executor.ainvoke({"input": user_query})

    tool_trace = []
    for action, observation in response.get("intermediate_steps", []):
        tool_trace.append(
            {
                "tool": action.tool,
                "tool_input": action.tool_input,
                "observation_preview": str(observation)[:350],
            }
        )

    return {
        "answer": response.get("output", ""),
        "tool_trace": tool_trace,
    }
