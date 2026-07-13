from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from extensions import db
from models.models import User, Company, Student


auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def validate_common_registration(data):
    if not data:
        return "Request body is required"

    if not data.get("username"):
        return "Username is required"

    if not data.get("email"):
        return "Email is required"

    if not data.get("password"):
        return "Password is required"

    if not data.get("name"):
        return "Name is required"

    return None


@auth_bp.route("/register/student", methods=["POST"])
def register_student():
    data = request.get_json()

    error = validate_common_registration(data)
    if error:
        return jsonify({"message": error}), 400

    if User.query.filter_by(username=data.get("username")).first():
        return jsonify({"message": "Username already exists"}), 400

    if User.query.filter_by(email=data.get("email")).first():
        return jsonify({"message": "Email already registered"}), 400

    try:
        user = User(
            username=data["username"],
            email=data["email"],
            role="student",
            is_active=True,
            is_approved=True
        )
        user.set_password(data["password"])
        db.session.add(user)
        db.session.flush()

        student = Student(
            user_id=user.id,
            name=data.get("name"),
            department=data.get("department"),
            resume_path=data.get("resume_path")
        )
        db.session.add(student)
        db.session.commit()

        return jsonify({
            "message": "Student registered successfully"
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "message": "Failed to register student",
            "error": str(e)
        }), 500


@auth_bp.route("/register/company", methods=["POST"])
def register_company():
    data = request.get_json()

    error = validate_common_registration(data)
    if error:
        return jsonify({"message": error}), 400

    if User.query.filter_by(username=data.get("username")).first():
        return jsonify({"message": "Username already exists"}), 400

    if User.query.filter_by(email=data.get("email")).first():
        return jsonify({"message": "Email already registered"}), 400

    try:
        user = User(
            username=data["username"],
            email=data["email"],
            role="company",
            is_active=True,
            is_approved=False
        )
        user.set_password(data["password"])
        db.session.add(user)
        db.session.flush()

        company = Company(
            user_id=user.id,
            name=data.get("name"),
            industry=data.get("industry"),
            location=data.get("location")
        )
        db.session.add(company)
        db.session.commit()

        return jsonify({
            "message": "Company registered. Pending admin approval."
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "message": "Failed to register company",
            "error": str(e)
        }), 500


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    if not data:
        return jsonify({"message": "Request body is required"}), 400

    username = data.get("username")
    password = data.get("password", "")

    if not username:
        return jsonify({"message": "Username is required"}), 400

    if not password:
        return jsonify({"message": "Password is required"}), 400

    user = User.query.filter_by(username=username).first()

    if not user or not user.check_password(password):
        return jsonify({"message": "Invalid credentials"}), 401

    if not user.is_active:
        return jsonify({"message": "Account blacklisted"}), 403

    if user.role == "company" and not user.is_approved:
        return jsonify({"message": "Company approval pending"}), 403

    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role}
    )

    return jsonify({
        "message": "Login successful",
        "access_token": access_token,
        "token": access_token,
        "role": user.role,
        "username": user.username,
        "user_id": user.id
    }), 200