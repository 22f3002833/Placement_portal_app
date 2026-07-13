from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from sqlalchemy.exc import IntegrityError

from extensions import db
from models.models import User, Company, Student

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def clean_string(value, lowercase=False):
    if value is None:
        return None
    value = str(value).strip()
    if lowercase:
        value = value.lower()
    return value


def validate_common_registration(data):
    if not data or not isinstance(data, dict):
        return "Request body is required"

    username = clean_string(data.get("username"))
    email = clean_string(data.get("email"), lowercase=True)
    password = data.get("password")
    name = clean_string(data.get("name"))

    if not username:
        return "Username is required"

    if not email:
        return "Email is required"

    if not password:
        return "Password is required"

    if not name:
        return "Name is required"

    return None


def validate_student_registration(data):
    error = validate_common_registration(data)
    if error:
        return error

    cgpa = data.get("cgpa")
    if cgpa not in [None, ""]:
        try:
            float(cgpa)
        except (TypeError, ValueError):
            return "CGPA must be a valid number"

    return None


def validate_company_registration(data):
    error = validate_common_registration(data)
    if error:
        return error

    return None


def user_exists(username=None, email=None):
    if username and User.query.filter_by(username=username).first():
        return "Username already exists"

    if email and User.query.filter_by(email=email).first():
        return "Email already registered"

    return None


@auth_bp.route("/register/student", methods=["POST"])
def register_student():
    data = request.get_json(silent=True)

    error = validate_student_registration(data)
    if error:
        return jsonify({"message": error}), 400

    username = clean_string(data.get("username"))
    email = clean_string(data.get("email"), lowercase=True)
    name = clean_string(data.get("name"))
    department = clean_string(data.get("department"))
    course = clean_string(data.get("course"))
    year_of_study = data.get("year_of_study")
    student_id_code = clean_string(data.get("student_id_code"))
    skills = clean_string(data.get("skills"))
    experience = clean_string(data.get("experience"))
    contact_number = clean_string(data.get("contact_number"))
    profile_summary = clean_string(data.get("profile_summary"))

    duplicate_error = user_exists(username=username, email=email)
    if duplicate_error:
        return jsonify({"message": duplicate_error}), 400

    try:
        cgpa = float(data["cgpa"]) if data.get("cgpa") not in [None, ""] else None

        user = User(
            username=username,
            email=email,
            role="student",
            is_active=True,
            is_approved=True
        )
        user.set_password(data["password"])
        db.session.add(user)
        db.session.flush()

        student = Student(
            user_id=user.id,
            name=name,
            student_id_code=student_id_code,
            department=department,
            course=course,
            year_of_study=year_of_study,
            cgpa=cgpa,
            skills=skills,
            experience=experience,
            contact_number=contact_number,
            profile_summary=profile_summary
        )
        db.session.add(student)
        db.session.commit()

        return jsonify({
            "message": "Student registered successfully"
        }), 201

    except IntegrityError:
        db.session.rollback()
        return jsonify({"message": "Username or email already exists"}), 400

    except Exception:
        db.session.rollback()
        return jsonify({"message": "Failed to register student"}), 500


@auth_bp.route("/register/company", methods=["POST"])
def register_company():
    data = request.get_json(silent=True)

    error = validate_company_registration(data)
    if error:
        return jsonify({"message": error}), 400

    username = clean_string(data.get("username"))
    email = clean_string(data.get("email"), lowercase=True)
    name = clean_string(data.get("name"))
    industry = clean_string(data.get("industry"))
    location = clean_string(data.get("location"))
    description = clean_string(data.get("description"))
    website = clean_string(data.get("website"))
    contact_person = clean_string(data.get("contact_person"))
    contact_email = clean_string(data.get("contact_email"), lowercase=True)
    contact_phone = clean_string(data.get("contact_phone"))

    duplicate_error = user_exists(username=username, email=email)
    if duplicate_error:
        return jsonify({"message": duplicate_error}), 400

    try:
        user = User(
            username=username,
            email=email,
            role="company",
            is_active=True,
            is_approved=False
        )
        user.set_password(data["password"])
        db.session.add(user)
        db.session.flush()

        company = Company(
            user_id=user.id,
            name=name,
            industry=industry,
            location=location,
            description=description,
            website=website,
            contact_person=contact_person,
            contact_email=contact_email,
            contact_phone=contact_phone
        )
        db.session.add(company)
        db.session.commit()

        return jsonify({
            "message": "Company registered successfully. Pending admin approval."
        }), 201

    except IntegrityError:
        db.session.rollback()
        return jsonify({"message": "Username or email already exists"}), 400

    except Exception:
        db.session.rollback()
        return jsonify({"message": "Failed to register company"}), 500


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True)
    if not data or not isinstance(data, dict):
        return jsonify({"message": "Request body is required"}), 400

    username = clean_string(data.get("username"))
    email = clean_string(data.get("email"), lowercase=True)
    password = data.get("password", "")

    if not username and not email:
        return jsonify({"message": "Username or email is required"}), 400

    if not password:
        return jsonify({"message": "Password is required"}), 400

    user = None
    if username:
        user = User.query.filter_by(username=username).first()
    elif email:
        user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify({"message": "Invalid credentials"}), 401

    if not user.is_active:
        return jsonify({"message": "Account blacklisted or inactive"}), 403

    if user.role == "company" and not user.is_approved:
        return jsonify({"message": "Company approval pending"}), 403

    token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role}
    )

    profile_id = None
    display_name = user.username

    if user.role == "student" and user.student:
        profile_id = user.student.id
        display_name = user.student.name or user.username
    elif user.role == "company" and user.company:
        profile_id = user.company.id
        display_name = user.company.name or user.username

    return jsonify({
        "access_token": token,
        "role": user.role,
        "user_id": user.id,
        "profile_id": profile_id,
        "username": user.username,
        "email": user.email,
        "display_name": display_name,
        "is_approved": user.is_approved
    }), 200