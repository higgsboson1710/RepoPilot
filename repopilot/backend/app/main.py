from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.db.database import init_database
from app.api.routes_xray import router as xray_router
from app.api.routes_agent import router as agent_router
from app.api.routes_telemetry import router as telemetry_router
from app.api.routes_auth import router as auth_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events: initializes SQLite database, users table, and cache tables."""
    init_database()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    description="Autonomous GitHub Codebase X-Ray, CVE Security Auditor & Issue-to-PR Agent",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS so the React frontend (running on Vite localhost:5173 or Vercel) can connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API v1 Routers
app.include_router(auth_router, prefix="/api/v1", tags=["Authentication (Google & Email)"])
app.include_router(xray_router, prefix="/api/v1", tags=["Architecture X-Ray & Dependencies"])
app.include_router(agent_router, prefix="/api/v1", tags=["Issue-to-PR Agent"])
app.include_router(telemetry_router, prefix="/api/v1", tags=["Telemetry & Resume Stats"])


@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "status": "running",
        "docs_url": "/docs",
        "version": "1.0.0",
    }
