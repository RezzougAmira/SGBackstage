from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Base de données
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/sgb_techtrace"

    # JWT
    JWT_SECRET: str = "votre_cle_secrete_tres_longue_et_complexe"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 1440  # 24 heures

    # Supabase Storage
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_BUCKET: str = "process-diagrammes"

    # Serveur
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 3001

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
