from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Centralized configuration loaded from backend/.env"""

    APP_NAME: str = "RepoPilot API"
    DEBUG: bool = True

    # Free LLM API Keys (Get free keys at console.groq.com and aistudio.google.com)
    GROQ_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""

    # Optional GitHub Personal Access Token (increases GitHub rate limit from 60/hr to 5000/hr)
    GITHUB_TOKEN: Optional[str] = None

    # Permanent Cloud PostgreSQL URL (Neon.tech / Supabase / Render Postgres)
    # When set in production, all users, telemetry & cache persist permanently across restarts!
    DATABASE_URL: Optional[str] = None

    # Local SQLite fallback path when running locally without DATABASE_URL
    SQLITE_DB_PATH: str = "repopilot_cache.db"

    # Enforce mandatory user login before running X-Ray or Issue-to-PR Agent
    REQUIRE_AUTH_FOR_SCANS: bool = True

    # Hard token-saving safety caps
    MAX_TREE_FILES: int = 350
    MAX_FILE_WINDOW_LINES: int = 150

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
