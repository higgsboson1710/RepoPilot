import json
import re
from typing import Any, Dict, List
import httpx

OSV_BATCH_URL = "https://api.osv.dev/v1/querybatch"


class DependencyAndCVEScanner:
    """
    Parses Python (requirements.txt) and Node.js (package.json) manifests
    and batch-queries Google's free OSV.dev API for real CVE security vulnerabilities.
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

    async def scan_dependencies_with_osv(
        self, dependencies: List[Dict[str, str]]
    ) -> List[Dict[str, Any]]:
        """
        Sends a single batch POST request to Google OSV.dev (100% free, no API key required)
        and enriches each dependency with live CVE/GHSA vulnerability IDs.
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
            resp = await client.post(OSV_BATCH_URL, json={"queries": queries})
            if resp.status_code != 200:
                return [
                    {**dep, "vulnerable": False, "cve_ids": [], "vuln_count": 0}
                    for dep in dependencies
                ]
            results = resp.json().get("results", [])

        enriched: List[Dict[str, Any]] = []
        for dep, osv_res in zip(dependencies, results):
            vulns = osv_res.get("vulns", []) if isinstance(osv_res, dict) else []
            cve_ids = [v.get("id", "UNKNOWN") for v in vulns if v.get("id")]
            enriched.append(
                {
                    "name": dep["name"],
                    "version": dep["version"],
                    "ecosystem": dep["ecosystem"],
                    "vulnerable": len(cve_ids) > 0,
                    "vuln_count": len(cve_ids),
                    "cve_ids": cve_ids[:5],
                }
            )
        return enriched
