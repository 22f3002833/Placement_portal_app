import os

from dotenv import load_dotenv, find_dotenv
load_dotenv(find_dotenv(), override=True)

print("MAIL_USERNAME =", repr(os.getenv("MAIL_USERNAME")))
print("MAIL_DEFAULT_SENDER =", repr(os.getenv("MAIL_DEFAULT_SENDER")))
print("MAIL_PASSWORD length =", len(os.getenv("MAIL_PASSWORD", "")))


class Config:
    # Core secrets
    SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret-key-change-this")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)

    # Database
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///placement_portal.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Uploads
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", os.path.join(os.getcwd(), "uploads"))
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB

    # CORS
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")

    # Admin seeding
    ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@placementportal.com")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

    # JWT expiry (seconds)
    JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", "3600"))

    # --- Email / Flask-Mail settings for Gmail ---

    # SMTP server configuration
    MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT = int(os.getenv("MAIL_PORT", "587"))
    MAIL_USE_TLS = os.getenv("MAIL_USE_TLS", "True").lower() == "true"
    MAIL_USE_SSL = os.getenv("MAIL_USE_SSL", "False").lower() == "true"

    # Gmail account (use app password, not normal password)
    MAIL_USERNAME = os.getenv("MAIL_USERNAME")  # YOUR_GMAIL_ADDRESS in .env
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")  # YOUR_APP_PASSWORD in .env

    # Default sender (From:)
    MAIL_DEFAULT_SENDER = os.getenv("MAIL_DEFAULT_SENDER", MAIL_USERNAME)