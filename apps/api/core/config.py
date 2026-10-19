import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    PROJECT_NAME: str = "AgencyOS API"
    VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api/v1"
    
    ENVIRONMENT: str = Field(default="development")
    DEBUG: bool = Field(default=True)
    
    # Database
    DATABASE_URL: str = Field(default="sqlite:///./agencyos.db")
    
    # Workspace & Execution
    WORKSPACE_ROOT: str = Field(default="./workspaces")
    
    # Security & CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Live Engine Configuration (Phase 6 & Gemini Support)
    GEMINI_API_KEY: str | None = Field(default=None)
    LIVE_ENGINE_API_KEY: str | None = Field(default=None)
    LIVE_ENGINE_BASE_URL: str = Field(default="https://generativelanguage.googleapis.com/v1beta/openai")
    LIVE_ENGINE_MODEL: str = Field(default="gemini-2.0-flash")
    DEFAULT_ENGINE_ADAPTER: str = Field(default="MockEngineAdapter")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
