from flask import Flask
from config import Config
from extensions import db, jwt, cors
from models.models import User, Company, Student, JobPosition, Application
from routes.auth import auth_bp

app = Flask(__name__)
app.config.from_object(Config)

db.init_app(app)
jwt.init_app(app)
cors.init_app(app)

app.register_blueprint(auth_bp)

with app.app_context():
    db.create_all()
    print("Database tables created!")

if __name__ == '__main__':
    app.run(debug=True, port=5000)