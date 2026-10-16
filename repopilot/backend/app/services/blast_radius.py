import ast
import os
import re
from typing import Dict, List, Set

JS_IMPORT_PATTERN = re.compile(
    r"""(?:import\s+.*?\s+from\s+['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\))"""
)


class BlastRadiusAnalyzer:
    """
    Static analysis engine that builds a cross-file import graph for Python and JS/TS files.
    Answers: 'If I modify file X to fix an issue, which downstream files depend on X?'
    """

    @staticmethod
    def extract_imports_from_source(filepath: str, source_code: str) -> Set[str]:
        """Extracts imported module/file identifiers from Python (via AST) or JS/TS (via Regex)."""
        imports: Set[str] = set()
        if filepath.endswith(".py"):
            try:
                tree = ast.parse(source_code)
                for node in ast.walk(tree):
                    if isinstance(node, ast.Import):
                        for alias in node.names:
                            imports.add(alias.name.replace(".", "/"))
                    elif isinstance(node, ast.ImportFrom) and node.module:
                        imports.add(node.module.replace(".", "/"))
            except SyntaxError:
                pass
        elif filepath.endswith((".js", ".jsx", ".ts", ".tsx")):
            for match in JS_IMPORT_PATTERN.finditer(source_code):
                raw_imp = match.group(1) or match.group(2)
                if raw_imp:
                    imports.add(raw_imp.lstrip("./"))
        return imports

    @classmethod
    def find_downstream_dependents(
        cls, target_filepath: str, repo_files_content: Dict[str, str]
    ) -> List[Dict[str, str]]:
        """
        Scans a dictionary of {filepath: source_code} and returns every file
        that imports or depends on `target_filepath`.
        """
        base_no_ext = os.path.splitext(target_filepath)[0]
        target_stem = os.path.basename(base_no_ext)

        dependents: List[Dict[str, str]] = []
        for candidate_path, content in repo_files_content.items():
            if candidate_path == target_filepath:
                continue
            extracted = cls.extract_imports_from_source(candidate_path, content)
            for imp in extracted:
                if imp.endswith(base_no_ext) or imp == target_stem or imp.endswith(f"/{target_stem}"):
                    dependents.append(
                        {
                            "dependent_file": candidate_path,
                            "matched_import": imp,
                        }
                    )
                    break
        return dependents
