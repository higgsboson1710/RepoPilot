import json
import re
from typing import Any, Dict, List
import httpx

OSV_BATCH_URL = "https://api.osv.dev/v1/querybatch"


class DependencyAndCVEScanner:
    """
    Parses Python (requirements.txt, pyproject.toml), Node.js (package.json),
    and Go (go.mod) manifests, batch-querying Google's free OSV.dev API for live CVEs.
    """

    @staticmethod
    def parse_requirements_txt(raw_text: str) -> List[Dict[str, str]]:
        """Extracts pinned or minimum version packages from requirements.txt."""
        deps: List[Dict[str, str]] = []
        pattern = re.compile(r"^([A-Za-z0-9_\-\.]+)\s*(?:\[.*?\])?\s*(?:==|>=|~=)\s*([A-Za-z0-9_\-\.]+)")
        for line in raw_text.splitlines():
            cleaned = line.strip()
            if not cleaned or cleaned.startswith("#") or cleaned.startswith("-"):
                continue
            match = pattern.match(cleaned)
            if match:
                deps.append(
                    {
                        "name": match.group(1).lower(),
                        "version": match.group(2),
                        "ecosystem": "PyPI",
                    }
                )
        return deps

    @staticmethod
    def parse_package_json(raw_text: str) -> List[Dict[str, str]]:
        """Extracts dependencies and devDependencies from package.json."""
        deps: List[Dict[str, str]] = []
        try:
            data = json.loads(raw_text)
        except json.JSONDecodeError:
            return deps

        combined = {}
        combined.update(data.get("dependencies", {}) or {})
        combined.update(data.get("devDependencies", {}) or {})

        for pkg_name, ver_spec in combined.items():
            if not isinstance(ver_spec, str):
                continue
            clean_ver = re.sub(r"^[\^~>=<v\s]+", "", ver_spec.strip())
            if clean_ver and clean_ver[0].isdigit():
                deps.append(
                    {
                        "name": pkg_name,
                        "version": clean_ver.split(" ")[0],
                        "ecosystem": "npm",
                    }
                )
        return deps

    @staticmethod
    def parse_go_mod(raw_text: str) -> List[Dict[str, str]]:
        """Extracts required Go packages and semantic versions from go.mod."""
        deps: List[Dict[str, str]] = []
        in_require_block = False
        for line in raw_text.splitlines():
            cleaned = line.strip()
            if not cleaned or cleaned.startswith("//"):
                continue
            if cleaned.startswith("require ("):
                in_require_block = True
                continue
            if in_require_block and cleaned == ")":
                in_require_block = False
                continue

            if in_require_block or cleaned.startswith("require "):
                target_str = cleaned.replace("require ", "").strip()
                parts = target_str.split()
                if len(parts) >= 2:
                    pkg_name = parts[0]
                    raw_ver = parts[1].lstrip("v")
                    clean_ver = raw_ver.split("+")[0]
                    deps.append(
                        {
                            "name": pkg_name,
                            "version": clean_ver,
                            "ecosystem": "Go",
                        }
                    )
        return deps

    @staticmethod
    def parse_pyproject_toml(raw_text: str) -> List[Dict[str, str]]:
        """Extracts dependencies from pyproject.toml."""
        deps: List[Dict[str, str]] = []
        pattern = re.compile(r'["\']([A-Za-z0-9_\-\.]+)\s*(?:==|>=|~=)\s*([A-Za-z0-9_\-\.]+)["\']')
        for match in pattern.finditer(raw_text):
            deps.append(
                {
                    "name": match.group(1).lower(),
                    "version": match.group(2),
                    "ecosystem": "PyPI",
                }
            )
        return deps

    async def scan_dependencies_with_osv(
        self, dependencies: List[Dict[str, str]]
    ) -> List[Dict[str, Any]]:
        """
        Sends batch POST queries to Google OSV.dev and returns enriched vulnerability findings.
        """
        if not dependencies:
            return []

        queries = [
            {
                "package": {"name": dep["name"], "ecosystem": dep["ecosystem"]},
                "version": dep["version"],
            }
            for dep in dependencies
        ]

        async with httpx.AsyncClient(timeout=20.0) as client:
            try:
                resp = await client.post(OSV_BATCH_URL, json={"queries": queries})
                if resp.status_code != 200:
                    results = []
                else:
                    results = resp.json().get("results", [])
            except Exception:
                results = []

        enriched: List[Dict[str, Any]] = []
        for idx, dep in enumerate(dependencies):
            osv_res = results[idx] if idx < len(results) and isinstance(results[idx], dict) else {}
            vulns = osv_res.get("vulns", []) or []
            cve_ids = [v.get("id", "UNKNOWN") for v in vulns if v.get("id")]
            is_vulnerable = len(cve_ids) > 0

            enriched.append(
                {
                    "name": dep["name"],
                    "version": dep["version"],
                    "ecosystem": dep["ecosystem"],
                    "vulnerable": is_vulnerable,
                    "is_vulnerable": is_vulnerable,
                    "vuln_count": len(cve_ids),
                    "cve_ids": cve_ids[:6],
                    "vulnerabilities": [{"id": cid} for cid in cve_ids[:6]],
                }
            )
        return enriched
