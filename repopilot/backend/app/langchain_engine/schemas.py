from typing import List, Optional
from pydantic import BaseModel, Field


class ComponentNode(BaseModel):
    name: str = Field(
        description="Logical component name, e.g., 'HTTP Session Manager' or 'Auth Middleware'"
    )
    role: str = Field(
        description="Clear 1-sentence explanation of what this component does in the codebase"
    )
    key_files: List[str] = Field(
        description="2 to 5 exact relative file paths from the repository tree belonging to this component"
    )


class OnboardingGuide(BaseModel):
    prerequisites: List[str] = Field(
        description="Required runtimes, tools, or services (e.g., 'Python 3.10+', 'Node.js 18+')"
    )
    setup_commands: List[str] = Field(
        description="Sequential shell commands to clone, install dependencies, and run locally"
    )
    required_env_vars: List[str] = Field(
        description="Environment variable names needed (or ['None required'] if none)"
    )
    where_to_start: str = Field(
        description="Exact entry-point file path and a 1-sentence tip on where a new contributor should start reading"
    )


class RepoXRayOutput(BaseModel):
    one_line_summary: str = Field(
        description="Crisp 1-sentence technical summary of what this repository does"
    )
    architectural_pattern: str = Field(
        description="e.g., 'Modular Python SDK', 'Layered REST Microservice', 'Full-Stack Monorepo'"
    )
    mermaid_diagram: str = Field(
        description="Valid Mermaid.js flowchart starting with 'graph TD' showing how 4-7 core modules interact. Use simple alphanumeric node IDs like A[Client] --> B[SessionManager]."
    )
    core_components: List[ComponentNode] = Field(
        description="4 to 6 core architectural components discovered in the file tree"
    )
    request_lifecycle: List[str] = Field(
        description="4 to 6 ordered steps tracing how a primary call or request flows through the files"
    )
    onboarding: OnboardingGuide


class DependencyExplanation(BaseModel):
    package_name: str = Field(description="Exact package name")
    category: str = Field(
        description="One of: Core Framework, HTTP/Networking, Database/ORM, Auth/Security, AI/LLM, Testing, Build/Utility"
    )
    purpose_in_repo: str = Field(
        description="1-sentence explanation of why this repository uses this package"
    )
    remediation_advice: Optional[str] = Field(
        default=None,
        description="If vulnerable CVEs exist, state the recommended upgrade command and fix; otherwise null",
    )


class DependencyAuditOutput(BaseModel):
    overall_health_summary: str = Field(
        description="1-2 sentence executive summary of dependency health and security posture"
    )
    packages: List[DependencyExplanation]
