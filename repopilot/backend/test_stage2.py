import asyncio
from app.services.github_client import GitHubClient
from app.langchain_engine.xray_chain import generate_repo_xray
from app.langchain_engine.issue_agent import run_issue_solver_agent


async def main():
    gh = GitHubClient()
    repo_url = "https://github.com/psf/requests"
    owner, repo = gh.parse_repo_url(repo_url)

    print(f"=== 1. Fetching Metadata & Clean Tree for {owner}/{repo} ===")
    overview = await gh.get_repo_overview(owner, repo)
    clean_tree = await gh.get_clean_file_tree(owner, repo, overview["latest_commit_sha"])
    readme = await gh.get_raw_file(owner, repo, "README.md", ref=overview["latest_commit_sha"])

    print("\n=== 2. Running LangChain Structured X-Ray Pipeline (.with_structured_output) ===")
    xray = await generate_repo_xray(overview, clean_tree, readme or "")
    print(f"Summary: {xray.one_line_summary}")
    print(f"Pattern: {xray.architectural_pattern}")
    print(f"\nGenerated Mermaid.js Architecture Diagram:\n{xray.mermaid_diagram}\n")
    print("Core Components:")
    for comp in xray.core_components:
        print(f" - {comp.name}: {comp.role} ({comp.key_files})")

    print("\n=== 3. Running LangChain Tool-Calling Agent (AgentExecutor) ===")
    query = (
        "Inspect how `Session.request` works in `src/requests/sessions.py`, "
        "check its blast radius, and explain how cookies are merged during a request."
    )
    agent_result = await run_issue_solver_agent(
        owner=owner,
        repo=repo,
        commit_sha=overview["latest_commit_sha"],
        clean_tree=clean_tree,
        user_query=query,
    )
    print("\n--- Agent Tool-Call Trace ---")
    for idx, step in enumerate(agent_result["tool_trace"], 1):
        print(f"Step {idx}: Called `{step['tool']}` with {step['tool_input']}")

    print("\n--- Final Agent Engineering Report ---")
    print(agent_result["answer"])


if __name__ == "__main__":
    asyncio.run(main())
