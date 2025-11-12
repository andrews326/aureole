# app/utils/config.py

from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Database
    DATABASE_URL_ASYNC: str

    # OpenAI
    OPENAI_API_KEY: str

    class Config:
        env_file = ".env"
        extra = "ignore"

# Singleton instance
settings = Settings()