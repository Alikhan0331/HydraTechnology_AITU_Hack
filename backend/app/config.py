"""Application configuration (env-driven).

Defaults are tuned for a zero-setup local demo: SQLite + open CORS for Vite.
For production / docker-compose set DATABASE_URL to a PostgreSQL DSN.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "HydraTechnology API"
    app_version: str = "0.1.0"

    # SQLite by default → works on any machine with no DB install.
    # PostgreSQL example: postgresql+psycopg://hydra:hydra@localhost:5432/hydra
    database_url: str = "sqlite:///./hydra.db"

    # Comma-separated list of allowed frontend origins.
    cors_origins: str = (
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:3000,http://127.0.0.1:3000"
    )

    # LLM (AI-dispatcher, wired in a later stage).
    llm_api_key: str = ""
    llm_model: str = "claude-opus-4-8"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
