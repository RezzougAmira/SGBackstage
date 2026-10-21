from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Base de données
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/sgb_techtrace"

    # JWT
    # Valeur de repli UNIQUEMENT pour le développement local. En production,
    # app.main refuse de démarrer si cette valeur n'a pas été remplacée :
    # une clé connue permet de forger des tokens valides et de contourner
    # toute l'authentification (cf. _verifier_secret_jwt dans main.py).
    JWT_SECRET: str = "votre_cle_secrete_tres_longue_et_complexe"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 1440  # 24 heures

    # Environnement : "development" (défaut) ou "production".
    ENVIRONMENT: str = "development"

    # Supabase Storage
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_BUCKET: str = "process-diagrammes"

    # CORS — origines autorisées en plus des localhost de développement,
    # séparées par des virgules (p.ex. https://sgb-techtrace.vercel.app).
    # Requis en production : sans cette variable, le frontend déployé est
    # bloqué par le navigateur car il n'est pas sur localhost.
    ALLOWED_ORIGINS: str = ""

    # Serveur
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 3001

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
