import asyncio
from app.services.github_client import GitHubClient
from app.services.osv_scanner import DependencyAndCVEScanner
from app.services.blast_radius import BlastRadiusAnalyzer


async def main():
    gh = GitHubClient()
    scanner = DependencyAndCVEScanner()

    # Test on a real public repository (e.g., pallets/flask or psf/requests)
    repo_url = "https://github.com/psf/requests"
    owner, repo = gh.parse_repo_url(repo_url)
    print(f"=== 1. Fetching Repo Overview for {owner}/{repo} ===")
    overview = await gh.get_repo_overview(owner, repo)
    print(f"Stars: {overview['stars']} | Default Branch: {overview['default_branch']}")
    print(f"Latest Commit SHA: {overview['latest_commit_sha']}")
    print(f"Languages: {overview['languages']}\n")

    print("=== 2. Fetching Clean Noise-Filtered File Tree ===")
    clean_tree = await gh.get_clean_file_tree(owner, repo, overview["latest_commit_sha"])
    print(f"Total clean code files: {len(clean_tree)}")
    print("Sample files:", clean_tree[:10], "\n")

    print("=== 3. Testing Surgical 30-Line File Window Reader ===")
    sample_py = next((f for f in clean_tree if f.endswith("sessions.py")), clean_tree[0])
    window = await gh.read_file_window(owner, repo, sample_py, start_line=1, end_line=30)
    print(window, "\n")

    print("=== 4. Testing Live OSV.dev Vulnerability Batch Scanner ===")
    sample_reqs = "requests==2.25.0\nflask==2.0.1\npydantic==2.9.2"
    parsed_deps = scanner.parse_requirements_txt(sample_reqs)
    cve_report = await scanner.scan_dependencies_with_osv(parsed_deps)
    for item in cve_report:
        status = f"VULNERABLE ({', '.join(item['cve_ids'])})" if item["vulnerable"] else "SAFE"
        print(f" - {item['name']}=={item['version']} [{item['ecosystem']}]: {status}")

    print("\n=== 5. Testing Cross-File Blast Radius Analyzer ===")
    mock_repo = {
        "src/requests/models.py": "class Request:\n    pass",
        "src/requests/sessions.py": "from requests.models import Request\n",
        "src/requests/api.py": "from requests import sessions\n",
    }
    blast = BlastRadiusAnalyzer.find_downstream_dependents("src/requests/models.py", mock_repo)
    print("Files impacted if 'src/requests/models.py' changes:", blast)


if __name__ == "__main__":
    asyncio.run(main())
