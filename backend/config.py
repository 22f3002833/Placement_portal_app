import os
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv(), override=True)


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret-key-change-this")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)

    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///placement_portal.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", os.path.join(os.getcwd(), "uploads"))
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024

    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")

    ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@placementportal.com")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

    JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", "3600"))

    MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT = int(os.getenv("MAIL_PORT", "587"))
    MAIL_USE_TLS = os.getenv("MAIL_USE_TLS", "True").lower() == "true"
    MAIL_USE_SSL = os.getenv("MAIL_USE_SSL", "False").lower() == "true"
    MAIL_USERNAME = os.getenv("MAIL_USERNAME")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
    MAIL_DEFAULT_SENDER = os.getenv("MAIL_DEFAULT_SENDER", MAIL_USERNAME)

    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    CACHE_TYPE = "RedisCache"
    CACHE_REDIS_URL = REDIS_URL
    CACHE_DEFAULT_TIMEOUT = int(os.getenv("CACHE_DEFAULT_TIMEOUT", "300"))