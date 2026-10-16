import asyncio
import time
import httpx
from app.main import app
from app.db.database import init_database


async def main():
    # Ensure SQLite tables are initialized
    init_database()

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver", timeout=60.0) as client:
        repo_url = "https://github.com/psf/requests"

        print("=== 1. Testing POST /api/v1/xray (1st Run — Cache Miss, Calls LLM & OSV.dev) ===")
        t0 = time.perf_counter()
        resp1 = await client.post("/api/v1/xray", json={"repo_url": repo_url})
        t1 = time.perf_counter()
        data1 = resp1.json()
        print(f"Status: {resp1.status_code} | Cached: {data1.get('cached')} | Time: {t1 - t0:.2f}s")
        print(f"Summary: {data1['xray']['one_line_summary']}")
        print(f"Dependency Health: {data1['dependencies']['overall_health_summary']}\n")

        print("=== 2. Testing POST /api/v1/xray (2nd Run — 0-Token Commit-SHA Cache Hit!) ===")
        t2 = time.perf_counter()
        resp2 = await client.post("/api/v1/xray", json={"repo_url": repo_url})
        t3 = time.perf_counter()
        data2 = resp2.json()
        print(f"Status: {resp2.status_code} | Cached: {data2.get('cached')} | Time: {(t3 - t2) * 1000:.1f} ms (0 LLM Tokens!)\n")

        print("=== 3. Testing GET /api/v1/issues (Fetching Open GitHub Issues) ===")
        issues_resp = await client.get("/api/v1/issues", params={"repo_url": repo_url})
        issues_data = issues_resp.json()
        print(f"Fetched {len(issues_data.get('issues', []))} open issues:")
        for issue in issues_data.get("issues", [])[:3]:
            print(f" - #{issue['number']}: {issue['title']}")

        print("\n=== 4. Testing GET /api/v1/stats (Live Resume Telemetry Counter) ===")
        stats_resp = await client.get("/api/v1/stats")
        print("Live Telemetry:", stats_resp.json())


if __name__ == "__main__":
    asyncio.run(main())
