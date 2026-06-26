from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # LLM
    google_api_key: str = ""
    gemini_model: str = "gemini-1.5-pro"   # swap to the current Pro model string
    llm_temperature: float = 0.2

    # Sandbox: the ONLY directory agents may touch
    project_root: Path = Path("./workspace").resolve()

    # Safety
    command_timeout_seconds: int = 90
    max_orchestration_iterations: int = 8

    # DB
    database_url: str = "sqlite:///./office.db"


settings = Settings()
settings.project_root.mkdir(parents=True, exist_ok=True)
