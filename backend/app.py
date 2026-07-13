import os
from flask import Flask, render_template, jsonify
from flask_cors import CORS

from config import Config
from extensions import db, jwt, mail
from routes.auth import auth_bp
from routes.admin import admin_bp
from routes.company import company_bp
from routes.student import student_bp
from models.models import User


def ensure_upload_folder(app):
    upload_folder = app.config.get("UPLOAD_FOLDER")
    if upload_folder:
        os.makedirs(upload_folder, exist_ok=True)


def seed_admin_user(app):
    with app.app_context():
        admin_username = app.config.get("ADMIN_USERNAME", "admin")
        admin_email = app.config.get("ADMIN_EMAIL", "admin@placementportal.com")
        admin_password = app.config.get("ADMIN_PASSWORD", "admin123")

        existing_admin = User.query.filter_by(email=admin_email).first()
        if existing_admin:
            return

        admin_user = User(
            username=admin_username,
            email=admin_email,
            role="admin",
            is_active=True,
            is_approved=True
        )
        admin_user.set_password(admin_password)

        db.session.add(admin_user)
        db.session.commit()


def register_jwt_handlers(app):
    @jwt.invalid_token_loader
    def invalid_token_callback(reason):
        return jsonify({
            "message": "Invalid token",
            "error": reason
        }), 422

    @jwt.unauthorized_loader
    def missing_token_callback(reason):
        return jsonify({
            "message": "Missing or invalid authorization header",
            "error": reason
        }), 401

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({
            "message": "Token has expired"
        }), 401

    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return jsonify({
            "message": "Token has been revoked"
        }), 401

    @jwt.needs_fresh_token_loader
    def fresh_token_callback(jwt_header, jwt_payload):
        return jsonify({
            "message": "Fresh token required"
        }), 401


def create_app():
    app = Flask(__name__, template_folder="templates", static_folder="static")
    app.config.from_object(Config)
    app.config["PROPAGATE_EXCEPTIONS"] = True

    CORS(
        app,
        resources={r"/api/*": {"origins": app.config.get("CORS_ORIGINS", "*")}},
        supports_credentials=False
    )

    db.init_app(app)
    jwt.init_app(app)
    mail.init_app(app)

    register_jwt_handlers(app)

    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(company_bp)
    app.register_blueprint(student_bp)

    @app.route("/", methods=["GET"])
    def index():
        return render_template("index.html")

    @app.route("/health", methods=["GET"])
    def health():
        return jsonify({
            "message": "Placement Portal API running"
        }), 200

    with app.app_context():
        db.create_all()
        ensure_upload_folder(app)
        seed_admin_user(app)

        print("\nREGISTERED ROUTES:")
        for rule in app.url_map.iter_rules():
            print(rule.methods, rule.rule)

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True)