from flask import Flask
from config import Config
from extensions import db
from models.models import User, Company, Student, JobPosition, Application

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)

with app.app_context():
    db.create_all()
    print("Database tables created!")

if __name__ == '__main__':
    app.run(debug=True, port=5000)
