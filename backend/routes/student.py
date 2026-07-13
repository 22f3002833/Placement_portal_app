import os
from functools import wraps
from datetime import datetime

from flask import Blueprint, request, jsonify, current_app, send_from_directory, g
from flask_jwt_extended import verify_jwt_in_request, get_jwt, get_jwt_identity
from werkzeug.utils import secure_filename
from sqlalchemy import or_

from extensions import db
from models.models import Student, JobPosition, Application, Placement, Company

student_bp = Blueprint("student", __name__, url_prefix="/api/student")


def clean_string(value, lowercase=False):
    if value is None:
        return None
    value = str(value).strip()
    if lowercase:
        value = value.lower()
    return value


def student_required():
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request()

            claims = get_jwt()
            if claims.get("role") != "student":
                return jsonify({"message": "Forbidden"}), 403

            uid = get_jwt_identity()
            try:
                user_id = int(uid)
            except (TypeError, ValueError):
                return jsonify({"message": "Invalid token identity"}), 401

            student = Student.query.filter_by(user_id=user_id).first()

            if not student:
                return jsonify({"message": "Student profile not found"}), 404

            if not student.user or not student.user.is_active:
                return jsonify({"message": "Student account is inactive"}), 403

            g.current_student = student
            return fn(*args, **kwargs)
        return decorator
    return wrapper


def allowed_file(filename):
    allowed_extensions = current_app.config.get("ALLOWED_EXTENSIONS", {"pdf", "doc", "docx"})
    return "." in filename and filename.rsplit(".", 1)[1].lower() in allowed_extensions


def serialize_job(job, applied_job_ids=None):
    applied = False
    if applied_job_ids is not None:
        applied = job.id in applied_job_ids

    return {
        "id": job.id,
        "company_id": job.company_id,
        "company_name": job.company.name if job.company else None,
        "company_industry": job.company.industry if job.company else None,
        "company_location": job.company.location if job.company else None,
        "title": job.title,
        "description": job.description,
        "skills_required": job.skills_required,
        "experience_required": job.experience_required,
        "salary": job.salary,
        "benefits": job.benefits,
        "location": job.location,
        "eligibility_criteria": job.eligibility_criteria,
        "application_deadline": job.application_deadline.isoformat() if job.application_deadline else None,
        "status": job.status,
        "applied": applied,
        "created_at": job.created_at.isoformat() if job.created_at else None
    }


def serialize_application(application):
    return {
        "id": application.id,
        "job_id": application.job_id,
        "job_title": application.job.title if application.job else None,
        "company_name": application.job.company.name if application.job and application.job.company else None,
        "status": application.status,
        "feedback": application.feedback,
        "interview_datetime": application.interview_datetime.isoformat() if application.interview_datetime else None,
        "interview_mode": application.interview_mode,
        "interview_location": application.interview_location,
        "interview_notes": application.interview_notes,
        "applied_at": application.created_at.isoformat() if application.created_at else None
    }


def serialize_placement(placement):
    return {
        "id": placement.id,
        "application_id": placement.application_id,
        "company_id": placement.company_id,
        "position": placement.position,
        "salary": placement.salary,
        "placed_at": placement.created_at.isoformat() if getattr(placement, "created_at", None) else None
    }


@student_bp.route("/profile", methods=["GET", "PATCH"])
@student_required()
def student_profile():
    student = g.current_student

    if request.method == "GET":
        return jsonify({
            "id": student.id,
            "user_id": student.user_id,
            "name": student.name,
            "email": student.user.email if student.user else None,
            "username": student.user.username if student.user else None,
            "student_id_code": student.student_id_code,
            "department": student.department,
            "course": student.course,
            "year_of_study": student.year_of_study,
            "cgpa": student.cgpa,
            "skills": student.skills,
            "experience": student.experience,
            "contact_number": student.contact_number,
            "profile_summary": student.profile_summary,
            "resume_uploaded": bool(student.resume_path),
            "resume_filename": student.resume_path
        }), 200

    data = request.get_json(silent=True) or {}

    if "name" in data:
        name = clean_string(data.get("name"))
        if not name:
            return jsonify({"message": "Name cannot be empty"}), 400
        student.name = name

    if "student_id_code" in data:
        student.student_id_code = clean_string(data.get("student_id_code"))

    if "department" in data:
        student.department = clean_string(data.get("department"))

    if "course" in data:
        student.course = clean_string(data.get("course"))

    if "year_of_study" in data:
        student.year_of_study = clean_string(data.get("year_of_study"))

    if "skills" in data:
        student.skills = data.get("skills")

    if "experience" in data:
        student.experience = data.get("experience")

    if "contact_number" in data:
        student.contact_number = clean_string(data.get("contact_number"))

    if "profile_summary" in data:
        student.profile_summary = data.get("profile_summary")

    if "cgpa" in data:
        cgpa = data.get("cgpa")
        if cgpa in [None, ""]:
            student.cgpa = None
        else:
            try:
                student.cgpa = float(cgpa)
            except (ValueError, TypeError):
                return jsonify({"message": "CGPA must be a valid number"}), 400

    db.session.commit()
    return jsonify({"message": "Student profile updated successfully"}), 200


@student_bp.route("/jobs", methods=["GET"])
@student_required()
def list_jobs():
    student = g.current_student

    search = request.args.get("search", "").strip()
    company = request.args.get("company", "").strip()
    skill = request.args.get("skill", "").strip()

    query = (
        JobPosition.query
        .join(Company)
        .join(Company.user)
        .filter(
            JobPosition.status == "Active",
            Company.user.has(is_approved=True),
            Company.user.has(is_active=True)
        )
    )

    if search:
        like_term = f"%{search}%"
        query = query.filter(
            or_(
                JobPosition.title.ilike(like_term),
                JobPosition.description.ilike(like_term),
                Company.name.ilike(like_term)
            )
        )

    if company:
        query = query.filter(Company.name.ilike(f"%{company}%"))

    if skill:
        query = query.filter(JobPosition.skills_required.ilike(f"%{skill}%"))

    jobs = query.order_by(JobPosition.created_at.desc()).all()

    applied_job_ids = {
        row.job_id
        for row in Application.query.with_entities(Application.job_id).filter_by(student_id=student.id).all()
    }

    return jsonify([serialize_job(job, applied_job_ids) for job in jobs]), 200


@student_bp.route("/jobs/<int:job_id>", methods=["GET"])
@student_required()
def job_detail(job_id):
    student = g.current_student
    job = JobPosition.query.get_or_404(job_id)

    if job.status != "Active":
        return jsonify({"message": "This job is not available"}), 404

    if not job.company or not job.company.user or not job.company.user.is_approved or not job.company.user.is_active:
        return jsonify({"message": "Company is not available"}), 404

    applied_job_ids = {
        row.job_id
        for row in Application.query.with_entities(Application.job_id).filter_by(student_id=student.id).all()
    }

    return jsonify(serialize_job(job, applied_job_ids)), 200


@student_bp.route("/apply/<int:job_id>", methods=["POST"])
@student_required()
def apply_to_job(job_id):
    student = g.current_student
    job = JobPosition.query.get_or_404(job_id)

    if job.status != "Active":
        return jsonify({"message": "This job is not open for applications"}), 400

    if not student.resume_path:
        return jsonify({"message": "Please upload your resume before applying"}), 400

    existing = Application.query.filter_by(student_id=student.id, job_id=job.id).first()
    if existing:
        return jsonify({"message": "You have already applied for this job"}), 400

    application = Application(
        student_id=student.id,
        job_id=job.id,
        status="Applied"
    )
    db.session.add(application)
    db.session.commit()

    return jsonify({"message": "Application submitted successfully"}), 201


@student_bp.route("/applications", methods=["GET"])
@student_required()
def student_applications():
    student = g.current_student
    applications = (
        Application.query
        .filter_by(student_id=student.id)
        .order_by(Application.created_at.desc())
        .all()
    )

    return jsonify([serialize_application(app) for app in applications]), 200


@student_bp.route("/placements", methods=["GET"])
@student_required()
def student_placements():
    student = g.current_student

    placements = (
        Placement.query
        .join(Application, Placement.application_id == Application.id)
        .filter(Application.student_id == student.id)
        .order_by(Placement.id.desc())
        .all()
    )

    return jsonify([serialize_placement(item) for item in placements]), 200


@student_bp.route("/resume/upload", methods=["POST"])
@student_required()
def upload_resume():
    student = g.current_student

    if "resume" not in request.files:
        return jsonify({"message": "No file part"}), 400

    file = request.files["resume"]

    if not file or file.filename == "":
        return jsonify({"message": "No selected file"}), 400

    if not allowed_file(file.filename):
        return jsonify({"message": "Invalid file type. Allowed: pdf, doc, docx"}), 400

    upload_folder = current_app.config.get("UPLOAD_FOLDER")
    if not upload_folder:
        return jsonify({"message": "Upload folder is not configured"}), 500

    os.makedirs(upload_folder, exist_ok=True)

    original_name = secure_filename(file.filename)
    ext = original_name.rsplit(".", 1)[1].lower()
    filename = f"student_{student.id}_resume_{int(datetime.utcnow().timestamp())}.{ext}"
    filepath = os.path.join(upload_folder, filename)

    try:
        if student.resume_path:
            old_path = os.path.join(upload_folder, student.resume_path)
            if os.path.exists(old_path):
                os.remove(old_path)

        file.save(filepath)
        student.resume_path = filename
        db.session.commit()

        return jsonify({
            "message": "Resume uploaded successfully",
            "filename": filename
        }), 200

    except Exception:
        db.session.rollback()
        return jsonify({"message": "Failed to upload resume"}), 500


@student_bp.route("/resume", methods=["GET"])
@student_required()
def get_own_resume():
    student = g.current_student

    if not student.resume_path:
        return jsonify({"message": "No resume uploaded"}), 404

    upload_folder = current_app.config.get("UPLOAD_FOLDER")
    if not upload_folder:
        return jsonify({"message": "Upload folder is not configured"}), 500

    file_path = os.path.join(upload_folder, student.resume_path)
    if not os.path.exists(file_path):
        return jsonify({"message": "Resume file not found"}), 404

    return send_from_directory(upload_folder, student.resume_path, as_attachment=False)