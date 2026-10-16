from typing import Any, Dict, List, Optional
from app.langchain_engine.llm_router import get_resilient_structured_chain
from app.langchain_engine.schemas import RepoXRayOutput, DependencyAuditOutput

XRAY_SYSTEM_PROMPT = """You are a Staff Software Architect performing an architectural X-Ray of a GitHub repository.
Analyze the repository metadata, language breakdown, clean file tree, and README excerpt.

Rules:
1. Base every file path strictly on the provided 'Clean File Tree'. Never invent file names.
2. For `mermaid_diagram`, output ONLY valid Mermaid syntax starting with `graph TD`. Do not wrap node labels in special characters that break Mermaid (use `A[Session API] --> B[HTTPAdapter]`).
3. Keep `setup_commands` practical and accurate based on the README and manifest files present in the tree.
"""

DEPS_SYSTEM_PROMPT = """You are an Application Security Engineer auditing a repository's dependencies and live OSV.dev CVE scan results.
Categorize each package by its architectural role in the project, explain why the project uses it in 1 sentence, and provide concrete upgrade remediation advice for any package marked VULNERABLE.
"""


async def generate_repo_xray(
    overview: Dict[str, Any],
    clean_tree: List[str],
    readme_excerpt: str,
    user_groq_key: Optional[str] = None,
    user_google_key: Optional[str] = None,
) -> RepoXRayOutput:
    """
    Runs a resilient LangChain LCEL structured pipeline to produce the full RepoXRayOutput
    (Mermaid diagram, core components, request lifecycle, and contributor onboarding guide).
    """
    human_template = (
        "Repository: {full_name}\n"
        "Description: {description}\n"
        "Languages: {languages}\n\n"
        "Clean File Tree ({file_count} files):\n{file_tree}\n\n"
        "README Excerpt:\n{readme}"
    )

    chain = get_resilient_structured_chain(
        system_prompt=XRAY_SYSTEM_PROMPT,
        human_template=human_template,
        schema=RepoXRayOutput,
        temperature=0.1,
        user_groq_key=user_groq_key,
        user_google_key=user_google_key,
    )

    result: RepoXRayOutput = await chain.ainvoke(
        {
            "full_name": overview.get("full_name"),
            "description": overview.get("description"),
            "languages": overview.get("languages"),
            "file_count": len(clean_tree),
            "file_tree": "\n".join(clean_tree[:220]),
            "readme": (readme_excerpt or "No README provided.")[:3500],
        }
    )
    return result


async def generate_dependency_audit(
    repo_full_name: str,
    osv_enriched_deps: List[Dict[str, Any]],
    user_groq_key: Optional[str] = None,
    user_google_key: Optional[str] = None,
) -> DependencyAuditOutput:
    """
    Enriches deterministic OSV.dev CVE findings with architectural categories and remediation advice.
    """
    human_template = (
        "Repository: {repo_full_name}\n"
        "Dependencies & Live OSV.dev CVE Scan Results:\n{deps_json}"
    )

    chain = get_resilient_structured_chain(
        system_prompt=DEPS_SYSTEM_PROMPT,
        human_template=human_template,
        schema=DependencyAuditOutput,
        temperature=0.1,
        user_groq_key=user_groq_key,
        user_google_key=user_google_key,
    )

    return await chain.ainvoke(
        {
            "repo_full_name": repo_full_name,
            "deps_json": str(osv_enriched_deps[:35]),
        }
    )
