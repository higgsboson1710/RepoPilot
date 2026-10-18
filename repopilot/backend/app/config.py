from typing import Optional
from pydantic import field_validator
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

    # Local SQLite database path for Commit-SHA caching & user telemetry
    SQLITE_DB_PATH: str = "repopilot_cache.db"

    # Hard token-saving safety caps
    MAX_TREE_FILES: int = 350
    MAX_FILE_WINDOW_LINES: int = 150

    @field_validator("GROQ_API_KEY", "GOOGLE_API_KEY", "GITHUB_TOKEN", mode="before")
    @classmethod
    def sanitize_secrets(cls, v):
        if isinstance(v, str):
            return v.strip().replace("\r", "").replace("\n", "").strip("'\"")
        return v

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
