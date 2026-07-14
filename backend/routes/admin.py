from functools import wraps

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, verify_jwt_in_request
from sqlalchemy import func, or_

from extensions import db, cache
from models.models import User, Company, Student, JobPosition, Application, Placement

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


def admin_required():
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()

            if claims.get("role") != "admin":
                return jsonify({"message": "Forbidden"}), 403

            return fn(*args, **kwargs)
        return decorator
    return wrapper


def clean_string(value):
    if value is None:
        return None
    return str(value).strip()


def companies_cache_key():
    search = (request.args.get("search", "") or "").strip().lower()
    return f"admin_companies:search={search}"


def students_cache_key():
    search = (request.args.get("search", "") or "").strip().lower()
    return f"admin_students:search={search}"


def clear_admin_cache():
    cache.clear()


def serialize_company(company):
    return {
        "id": company.id,
        "user_id": company.user_id,
        "name": company.name,
        "industry": company.industry,
        "location": company.location,
        "description": company.description,
        "website": company.website,
        "contact_person": company.contact_person,
        "contact_email": company.contact_email,
        "contact_phone": company.contact_phone,
        "email": company.user.email if company.user else None,
        "username": company.user.username if company.user else None,
        "is_approved": company.user.is_approved if company.user else False,
        "is_active": company.user.is_active if company.user else False,
        "created_at": company.created_at.isoformat() if company.created_at else None
    }


def serialize_pending_company(company):
    return {
        "id": company.id,
        "user_id": company.user_id,
        "name": company.name,
        "industry": company.industry,
        "location": company.location,
        "description": company.description,
        "website": company.website,
        "contact_person": company.contact_person,
        "contact_email": company.contact_email,
        "contact_phone": company.contact_phone,
        "email": company.user.email if company.user else None,
        "username": company.user.username if company.user else None,
        "created_at": company.created_at.isoformat() if company.created_at else None
    }


def serialize_student(student):
    return {
        "id": student.id,
        "user_id": student.user_id,
        "name": student.name,
        "student_id_code": student.student_id_code,
        "department": student.department,
        "course": student.course,
        "year_of_study": student.year_of_study,
        "cgpa": student.cgpa,
        "skills": student.skills,
        "experience": student.experience,
        "contact_number": student.contact_number,
        "resume_path": student.resume_path,
        "resume_uploaded": bool(student.resume_path),
        "profile_summary": student.profile_summary,
        "email": student.user.email if student.user else None,
        "username": student.user.username if student.user else None,
        "is_active": student.user.is_active if student.user else False,
        "created_at": student.created_at.isoformat() if student.created_at else None
    }


def serialize_job(job, applications_count=None):
    return {
        "id": job.id,
        "company_id": job.company_id,
        "company_name": job.company.name if job.company else None,
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
        "applications_count": int(applications_count or 0),
        "created_at": job.created_at.isoformat() if job.created_at else None
    }


def serialize_application(app):
    return {
        "id": app.id,
        "student_id": app.student_id,
        "student_name": app.student.name if app.student else None,
        "job_id": app.job_id,
        "job_title": app.job.title if app.job else None,
        "company_name": app.job.company.name if app.job and app.job.company else None,
        "status": app.status,
        "feedback": app.feedback,
        "interview_datetime": app.interview_datetime.isoformat() if app.interview_datetime else None,
        "interview_mode": app.interview_mode,
        "interview_location": app.interview_location,
        "interview_notes": app.interview_notes,
        "created_at": app.created_at.isoformat() if app.created_at else None
    }


@admin_bp.route("/stats", methods=["GET"])
@admin_required()
def stats():
    total_students = Student.query.count()
    total_companies = Company.query.count()
    total_jobs = JobPosition.query.count()
    total_applications = Application.query.count()
    total_placements = Placement.query.count()

    pending_companies = (
        Company.query.join(User)
        .filter(User.role == "company", User.is_approved.is_(False))
        .count()
    )

    active_jobs = JobPosition.query.filter_by(status="Active").count()
    closed_jobs = JobPosition.query.filter_by(status="Closed").count()

    return jsonify({
        "total_students": total_students,
        "total_companies": total_companies,
        "total_jobs": total_jobs,
        "total_applications": total_applications,
        "total_placements": total_placements,
        "pending_companies": pending_companies,
        "active_jobs": active_jobs,
        "closed_jobs": closed_jobs
    }), 200


@admin_bp.route("/companies", methods=["GET"])
@admin_required()
@cache.cached(timeout=300, key_prefix=companies_cache_key)
def get_companies():
    search = clean_string(request.args.get("search", "")) or ""

    query = Company.query.join(User)

    if search:
        like_term = f"%{search}%"
        query = query.filter(
            or_(
                Company.name.ilike(like_term),
                Company.industry.ilike(like_term),
                Company.location.ilike(like_term),
                User.email.ilike(like_term),
                User.username.ilike(like_term)
            )
        )

    companies = query.order_by(Company.created_at.desc()).all()
    return jsonify([serialize_company(company) for company in companies]), 200


@admin_bp.route("/companies/pending", methods=["GET"])
@admin_required()
def get_pending_companies():
    companies = (
        Company.query.join(User)
        .filter(User.role == "company", User.is_approved.is_(False))
        .order_by(Company.created_at.desc())
        .all()
    )

    return jsonify([serialize_pending_company(company) for company in companies]), 200


@admin_bp.route("/companies/<int:company_id>/approve", methods=["PATCH"])
@admin_required()
def approve_company(company_id):
    company = db.get_or_404(Company, company_id)

    if not company.user:
        return jsonify({"message": "Company user not found"}), 404

    company.user.is_approved = True
    db.session.commit()
    clear_admin_cache()

    return jsonify({"message": "Company approved successfully"}), 200


@admin_bp.route("/companies/<int:company_id>", methods=["DELETE"])
@admin_required()
def remove_company(company_id):
    company = db.get_or_404(Company, company_id)

    if company.user:
        company.user.is_active = False
        db.session.commit()
        clear_admin_cache()
        return jsonify({"message": "Company deactivated successfully"}), 200

    db.session.delete(company)
    db.session.commit()
    clear_admin_cache()
    return jsonify({"message": "Company removed successfully"}), 200


@admin_bp.route("/students", methods=["GET"])
@admin_required()
@cache.cached(timeout=300, key_prefix=students_cache_key)
def get_students():
    search = clean_string(request.args.get("search", "")) or ""

    query = Student.query.join(User)

    if search:
        like_term = f"%{search}%"
        query = query.filter(
            or_(
                Student.name.ilike(like_term),
                Student.department.ilike(like_term),
                Student.student_id_code.ilike(like_term),
                Student.contact_number.ilike(like_term),
                User.email.ilike(like_term),
                User.username.ilike(like_term)
            )
        )

    students = query.order_by(Student.created_at.desc()).all()
    return jsonify([serialize_student(student) for student in students]), 200


@admin_bp.route("/students/<int:student_id>", methods=["GET"])
@admin_required()
def get_student_detail(student_id):
    student = db.get_or_404(Student, student_id)

    applications = []
    for application in student.applications:
        applications.append({
            "application_id": application.id,
            "job_id": application.job.id if application.job else None,
            "job_title": application.job.title if application.job else None,
            "company_name": application.job.company.name if application.job and application.job.company else None,
            "status": application.status,
            "feedback": application.feedback,
            "interview_datetime": application.interview_datetime.isoformat() if application.interview_datetime else None,
            "interview_mode": application.interview_mode,
            "interview_location": application.interview_location,
            "interview_notes": application.interview_notes
        })

    payload = serialize_student(student)
    payload["applications"] = applications
    return jsonify(payload), 200


@admin_bp.route("/jobs", methods=["GET"])
@admin_required()
def get_jobs():
    search = clean_string(request.args.get("search", "")) or ""
    status = clean_string(request.args.get("status", "")) or ""

    applications_subquery = (
        db.session.query(
            Application.job_id,
            func.count(Application.id).label("applications_count")
        )
        .group_by(Application.job_id)
        .subquery()
    )

    query = (
        db.session.query(
            JobPosition,
            func.coalesce(applications_subquery.c.applications_count, 0).label("applications_count")
        )
        .join(Company, JobPosition.company_id == Company.id)
        .outerjoin(applications_subquery, JobPosition.id == applications_subquery.c.job_id)
    )

    if search:
        like_term = f"%{search}%"
        query = query.filter(
            or_(
                JobPosition.title.ilike(like_term),
                JobPosition.description.ilike(like_term),
                JobPosition.skills_required.ilike(like_term),
                Company.name.ilike(like_term),
                Company.industry.ilike(like_term)
            )
        )

    if status:
        query = query.filter(JobPosition.status == status)

    jobs = query.order_by(JobPosition.created_at.desc()).all()
    return jsonify([serialize_job(job, applications_count) for job, applications_count in jobs]), 200


@admin_bp.route("/jobs/<int:job_id>", methods=["PATCH", "DELETE"])
@admin_required()
def manage_job(job_id):
    job = db.get_or_404(JobPosition, job_id)

    if request.method == "DELETE":
        db.session.delete(job)
        db.session.commit()
        clear_admin_cache()
        return jsonify({"message": "Job removed successfully"}), 200

    data = request.get_json(silent=True) or {}
    status = data.get("status")

    if not status:
        return jsonify({"message": "Status is required"}), 400

    allowed_statuses = {"Active", "Closed", "Approved", "Rejected"}
    if status not in allowed_statuses:
        return jsonify({"message": "Invalid status"}), 400

    job.status = status
    db.session.commit()
    clear_admin_cache()

    return jsonify({"message": "Job status updated successfully"}), 200


@admin_bp.route("/applications", methods=["GET"])
@admin_required()
def get_applications():
    status = clean_string(request.args.get("status", "")) or ""
    company_id = request.args.get("company_id", type=int)
    student_id = request.args.get("student_id", type=int)

    query = Application.query.join(JobPosition).join(Student)

    if status:
        query = query.filter(Application.status == status)

    if company_id:
        query = query.filter(JobPosition.company_id == company_id)

    if student_id:
        query = query.filter(Application.student_id == student_id)

    applications = query.order_by(Application.created_at.desc()).all()
    return jsonify([serialize_application(app) for app in applications]), 200


@admin_bp.route("/users/<int:user_id>/blacklist", methods=["PATCH"])
@admin_required()
def toggle_blacklist(user_id):
    user = db.get_or_404(User, user_id)

    if user.role == "admin":
        return jsonify({"message": "Admin user cannot be blacklisted"}), 400

    user.is_active = not user.is_active
    db.session.commit()
    clear_admin_cache()

    return jsonify({
        "message": f"User active status updated to {user.is_active}",
        "user_id": user.id,
        "is_active": user.is_active
    }), 200