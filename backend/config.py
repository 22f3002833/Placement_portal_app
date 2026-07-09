class Config:
    SECRET_KEY = 'dev'
    JWT_SECRET_KEY = 'dev-jwt-secret'
    SQLALCHEMY_DATABASE_URI = 'sqlite:///placement.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False