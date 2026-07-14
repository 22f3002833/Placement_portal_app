import os
from datetime import datetime
from functools import wraps

from flask import Blueprint, request, jsonify, send_from_directory, current_app, g
from flask_jwt_extended import verify_jwt_in_request, get_jwt, get_jwt_identity
from flask_mail import Message
from sqlalchemy import func
from werkzeug.utils import secure_filename

from extensions import db, mail, cache
from models.models import Company, JobPosition, Application, Placement, Student
from celery_tasks import (
    send_interview_reminder,
    export_company_history_csv,
    generate_company_monthly_report,
)

company_bp = Blueprint("company", __name__, url_prefix="/api/company")


def clean_string(value, lowercase=False):
    if value is None:
        return None
    value = str(value).strip()
    if lowercase:
        value = value.lower()
    return value


def safe_send_interview_reminder(student_email, student_name, company_name, interview_date):
    try:
        send_interview_reminder.delay(
            student_email=student_email,
            student_name=student_name,
            company_name=company_name,
            interview_date=interview_date,
        )
        return True
    except Exception as e:
        print(f"[WARN] Celery/Redis not available, skipping email task: {e}")
        return False


def send_interview_email_direct(
    student_email,
    student_name,
    company_name,
    job_title,
    interview_datetime,
    interview_mode=None,
    interview_location=None,
    interview_notes=None
):
    try:
        if interview_datetime:
            interview_time_text = interview_datetime.strftime("%d %b %Y, %I:%M %p")
        else:
            interview_time_text = "To be confirmed"

        subject = f"Interview Scheduled - {job_title} at {company_name}"

        body = f"""Dear {student_name},

Congratulations! Your application has been moved to the Interview stage.

Interview Details:
Company: {company_name}
Position: {job_title}
Date and Time: {interview_time_text}
Mode: {interview_mode or 'Not specified'}
Location / Link: {interview_location or 'Not specified'}
Notes: {interview_notes or 'No additional notes'}

Please be available on time and prepare well for the interview.

Best regards,
{company_name}
Placement Portal
"""

        msg = Message(
            subject=subject,
            recipients=[student_email],
            body=body
        )
        mail.send(msg)
        return True
    except Exception as e:
        print(f"[WARN] Direct email sending failed: {e}")
        return False


def company_required():
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request()

            claims = get_jwt()
            if claims.get("role") != "company":
                return jsonify({"message": "Forbidden"}), 403

            uid = get_jwt_identity()
            try:
                user_id = int(uid)
            except (TypeError, ValueError):
                return jsonify({"message": "Invalid token identity"}), 401

            company = Company.query.filter_by(user_id=user_id).first()

            if not company:
                return jsonify({"message": "Company profile not found"}), 404

            if not company.user or not company.user.is_active:
                return jsonify({"message": "Company account is inactive"}), 403

            if not company.user.is_approved:
                return jsonify({"message": "Company account is pending admin approval"}), 403

            g.current_company = company
            return fn(*args, **kwargs)

        return decorator

    return wrapper


def parse_float(value, field_name):
    if value in [None, ""]:
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        raise ValueError(f"{field_name} must be a number")


def parse_iso_datetime(value, field_name):
    if value in [None, ""]:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        raise ValueError(f"{field_name} must be a valid ISO datetime")


def parse_date(value, field_name):
    if value in [None, ""]:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        raise ValueError(f"{field_name} must be in YYYY-MM-DD format")


def clear_related_cache():
    cache.clear()


def serialize_job(job, applications_count=None):
    count_value = applications_count if applications_count is not None else len(job.applications)

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
        "applications_count": int(count_value or 0),
        "created_at": job.created_at.isoformat() if job.created_at else None,
    }


def serialize_application(app):
    return {
        "id": app.id,
        "student_id": app.student_id,
        "student_name": app.student.name if app.student else None,
        "student_email": app.student.user.email if app.student and app.student.user else None,
        "student_department": app.student.department if app.student else None,
        "student_skills": app.student.skills if app.student else None,
        "resume_uploaded": bool(app.student.resume_path) if app.student else False,
        "job_id": app.job_id,
        "job_title": app.job.title if app.job else None,
        "status": app.status,
        "feedback": app.feedback,
        "interview_datetime": app.interview_datetime.isoformat() if app.interview_datetime else None,
        "interview_mode": app.interview_mode,
        "interview_location": app.interview_location,
        "interview_notes": app.interview_notes,
        "created_at": app.created_at.isoformat() if app.created_at else None,
    }


def serialize_placement(placement):
    student = placement.student
    return {
        "id": placement.id,
        "application_id": placement.application_id,
        "student_id": placement.student_id,
        "student_name": student.name if student else None,
        "position": placement.position,
        "salary": placement.salary,
        "joining_date": placement.joining_date.isoformat() if placement.joining_date else None,
        "offer_letter_path": placement.offer_letter_path,
        "remarks": placement.remarks,
        "created_at": placement.created_at.isoformat() if placement.created_at else None,
    }


@company_bp.route("/dashboard", methods=["GET"])
@company_required()
def dashboard():
    company = g.current_company

    jobs = JobPosition.query.filter_by(company_id=company.id).all()
    applications = (
        Application.query
        .join(JobPosition)
        .filter(JobPosition.company_id == company.id)
        .all()
    )

    shortlisted_count = sum(1 for app in applications if app.status == "Shortlisted")
    interview_count = sum(1 for app in applications if app.status == "Interview")
    offer_count = sum(1 for app in applications if app.status == "Offer")
    placed_count = sum(1 for app in applications if app.status == "Placed")

    return jsonify({
        "company": {
            "id": company.id,
            "name": company.name,
            "industry": company.industry,
            "location": company.location,
            "description": company.description,
            "website": company.website,
            "contact_person": company.contact_person,
            "contact_email": company.contact_email,
            "contact_phone": company.contact_phone,
        },
        "stats": {
            "total_jobs": len(jobs),
            "active_jobs": sum(1 for job in jobs if job.status == "Active"),
            "closed_jobs": sum(1 for job in jobs if job.status == "Closed"),
            "total_applications": len(applications),
            "shortlisted_applications": shortlisted_count,
            "interview_applications": interview_count,
            "offer_applications": offer_count,
            "placed_applications": placed_count,
        }
    }), 200


@company_bp.route("/jobs", methods=["GET", "POST"])
@company_required()
def jobs():
    company = g.current_company

    if request.method == "GET":
        status = request.args.get("status", "").strip()

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
            .outerjoin(applications_subquery, JobPosition.id == applications_subquery.c.job_id)
            .filter(JobPosition.company_id == company.id)
        )

        if status:
            query = query.filter(JobPosition.status == status)

        jobs = query.order_by(JobPosition.created_at.desc()).all()
        return jsonify([serialize_job(job, applications_count) for job, applications_count in jobs]), 200

    data = request.get_json(silent=True) or {}

    title = clean_string(data.get("title"))
    if not title:
        return jsonify({"message": "Job title is required"}), 400

    try:
        salary = parse_float(data.get("salary"), "Salary")
        application_deadline = parse_iso_datetime(data.get("application_deadline"), "Application deadline")
    except ValueError as exc:
        return jsonify({"message": str(exc)}), 400

    allowed_statuses = {"Active", "Closed"}
    requested_status = data.get("status", "Active")
    if requested_status not in allowed_statuses:
        return jsonify({"message": "Invalid job status"}), 400

    job = JobPosition(
        company_id=company.id,
        title=title,
        description=data.get("description"),
        skills_required=data.get("skills_required"),
        experience_required=clean_string(data.get("experience_required")),
        salary=salary,
        benefits=data.get("benefits"),
        location=clean_string(data.get("location")),
        eligibility_criteria=data.get("eligibility_criteria"),
        application_deadline=application_deadline,
        status=requested_status
    )

    db.session.add(job)
    db.session.commit()
    clear_related_cache()

    return jsonify({
        "message": "Job created successfully",
        "job": serialize_job(job, 0)
    }), 201


@company_bp.route("/jobs/<int:job_id>", methods=["GET", "PATCH", "DELETE"])
@company_required()
def update_job(job_id):
    company = g.current_company
    job = JobPosition.query.filter_by(id=job_id, company_id=company.id).first_or_404()

    if request.method == "GET":
        return jsonify(serialize_job(job)), 200

    if request.method == "DELETE":
        db.session.delete(job)
        db.session.commit()
        clear_related_cache()
        return jsonify({"message": "Job deleted successfully"}), 200

    data = request.get_json(silent=True) or {}

    if "title" in data:
        title = clean_string(data.get("title"))
        if not title:
            return jsonify({"message": "Job title cannot be empty"}), 400
        job.title = title

    if "description" in data:
        job.description = data.get("description")

    if "skills_required" in data:
        job.skills_required = data.get("skills_required")

    if "experience_required" in data:
        job.experience_required = clean_string(data.get("experience_required"))

    if "benefits" in data:
        job.benefits = data.get("benefits")

    if "location" in data:
        job.location = clean_string(data.get("location"))

    if "eligibility_criteria" in data:
        job.eligibility_criteria = data.get("eligibility_criteria")

    if "salary" in data:
        try:
            job.salary = parse_float(data.get("salary"), "Salary")
        except ValueError as exc:
            return jsonify({"message": str(exc)}), 400

    if "application_deadline" in data:
        try:
            job.application_deadline = parse_iso_datetime(
                data.get("application_deadline"),
                "Application deadline"
            )
        except ValueError as exc:
            return jsonify({"message": str(exc)}), 400

    if "status" in data:
        if data["status"] not in ["Active", "Closed"]:
            return jsonify({"message": "Invalid job status"}), 400
        job.status = data["status"]

    db.session.commit()
    clear_related_cache()

    return jsonify({
        "message": "Job updated successfully",
        "job": serialize_job(job)
    }), 200


@company_bp.route("/jobs/<int:job_id>/applications", methods=["GET"])
@company_required()
def job_applications(job_id):
    company = g.current_company
    job = JobPosition.query.filter_by(id=job_id, company_id=company.id).first_or_404()
    status = request.args.get("status", "").strip()

    query = Application.query.filter_by(job_id=job.id)
    if status:
        query = query.filter_by(status=status)

    apps = query.order_by(Application.created_at.desc()).all()
    return jsonify([serialize_application(app) for app in apps]), 200


@company_bp.route("/applications/<int:app_id>", methods=["GET"])
@company_required()
def application_detail(app_id):
    company = g.current_company
    app_obj = Application.query.get_or_404(app_id)

    if not app_obj.job or app_obj.job.company_id != company.id:
        return jsonify({"message": "Forbidden"}), 403

    return jsonify(serialize_application(app_obj)), 200


@company_bp.route("/applications/<int:app_id>/status", methods=["PATCH"])
@company_required()
def update_application_status(app_id):
    company = g.current_company
    app_obj = Application.query.get_or_404(app_id)

    if not app_obj.job or app_obj.job.company_id != company.id:
        return jsonify({"message": "Forbidden"}), 403

    data = request.get_json(silent=True) or {}
    new_status = data.get("status", app_obj.status)

    allowed_statuses = ["Applied", "Shortlisted", "Interview", "Offer", "Rejected", "Placed"]
    if new_status not in allowed_statuses:
        return jsonify({"message": f"Invalid status. Must be one of {allowed_statuses}"}), 400

    if "feedback" in data:
        app_obj.feedback = data.get("feedback")

    if new_status == "Interview":
        interview_datetime_raw = data.get("interview_datetime")
        if not interview_datetime_raw:
            return jsonify({"message": "interview_datetime is required for Interview status"}), 400

        try:
            app_obj.interview_datetime = parse_iso_datetime(interview_datetime_raw, "Interview datetime")
        except ValueError as exc:
            return jsonify({"message": str(exc)}), 400

        app_obj.interview_mode = clean_string(data.get("interview_mode"))
        app_obj.interview_location = clean_string(data.get("interview_location"))
        app_obj.interview_notes = data.get("interview_notes")

    elif new_status in ["Rejected", "Placed"]:
        app_obj.interview_datetime = None
        app_obj.interview_mode = None
        app_obj.interview_location = None
        app_obj.interview_notes = None

    app_obj.status = new_status
    db.session.commit()
    clear_related_cache()

    student_email = None
    student_name = "Student"
    job_title = app_obj.job.title if app_obj.job else "Job Opportunity"

    if app_obj.student:
        student_name = app_obj.student.name or "Student"

    if app_obj.student and app_obj.student.user:
        student_email = clean_string(app_obj.student.user.email)

    email_sent = False
    celery_sent = False

    if new_status == "Interview" and student_email:
        email_sent = send_interview_email_direct(
            student_email=student_email,
            student_name=student_name,
            company_name=company.name,
            job_title=job_title,
            interview_datetime=app_obj.interview_datetime,
            interview_mode=app_obj.interview_mode,
            interview_location=app_obj.interview_location,
            interview_notes=app_obj.interview_notes
        )

        interview_display = (
            app_obj.interview_datetime.isoformat()
            if app_obj.interview_datetime else "To be confirmed"
        )

        celery_sent = safe_send_interview_reminder(
            student_email=student_email,
            student_name=student_name,
            company_name=company.name,
            interview_date=interview_display
        )

    message = "Application status updated successfully"
    if new_status == "Interview":
        if email_sent:
            message = "Interview scheduled and email sent successfully"
        else:
            message = "Interview scheduled, but email could not be sent"

    return jsonify({
        "message": message,
        "application": serialize_application(app_obj),
        "email_sent": email_sent,
        "celery_task_sent": celery_sent
    }), 200


@company_bp.route("/applications/<int:app_id>/finalize", methods=["POST"])
@company_required()
def finalize_placement(app_id):
    company = g.current_company
    application = Application.query.get_or_404(app_id)

    if not application.job or application.job.company_id != company.id:
        return jsonify({"message": "Not authorized for this application"}), 403

    if application.status not in ["Shortlisted", "Interview", "Offer"]:
        return jsonify({"message": "Only shortlisted, interview, or offered applications can be finalized"}), 400

    existing = Placement.query.filter_by(application_id=app_id).first()
    if existing:
        return jsonify({"message": "Placement already recorded for this application"}), 400

    data = request.get_json(silent=True) or {}

    try:
        salary = parse_float(data.get("salary"), "Salary")
        joining_date = parse_date(data.get("joining_date"), "joining_date")
    except ValueError as exc:
        return jsonify({"message": str(exc)}), 400

    if salary is None:
        salary = application.job.salary

    position = clean_string(data.get("position")) or application.job.title

    placement = Placement(
        application_id=application.id,
        student_id=application.student_id,
        company_id=company.id,
        position=position,
        salary=salary,
        joining_date=joining_date,
        offer_letter_path=data.get("offer_letter_path"),
        remarks=data.get("remarks")
    )

    application.status = "Placed"
    application.interview_datetime = None
    application.interview_mode = None
    application.interview_location = None
    application.interview_notes = None

    db.session.add(placement)
    db.session.commit()
    clear_related_cache()

    return jsonify({
        "message": "Placement finalized successfully",
        "placement_id": placement.id
    }), 201


@company_bp.route("/placements", methods=["GET"])
@company_required()
def list_placements():
    company = g.current_company

    placements = (
        Placement.query
        .filter_by(company_id=company.id)
        .order_by(Placement.created_at.desc())
        .all()
    )

    return jsonify([serialize_placement(placement) for placement in placements]), 200


@company_bp.route("/applications/history", methods=["GET"])
@company_required()
def company_application_history():
    company = g.current_company

    applications = (
        Application.query
        .join(JobPosition)
        .filter(JobPosition.company_id == company.id)
        .order_by(Application.created_at.desc())
        .all()
    )

    result = []
    for app in applications:
        placement = Placement.query.filter_by(application_id=app.id).first()
        result.append({
            "application_id": app.id,
            "student_id": app.student_id,
            "student_name": app.student.name if app.student else None,
            "student_email": app.student.user.email if app.student and app.student.user else None,
            "job_id": app.job_id,
            "job_title": app.job.title if app.job else None,
            "status": app.status,
            "feedback": app.feedback,
            "interview_datetime": app.interview_datetime.isoformat() if app.interview_datetime else None,
            "interview_mode": app.interview_mode,
            "interview_location": app.interview_location,
            "placement_position": placement.position if placement else None,
            "placement_salary": placement.salary if placement else None,
            "applied_at": app.created_at.isoformat() if app.created_at else None,
        })

    return jsonify(result), 200


@company_bp.route("/exports/history", methods=["POST"])
@company_required()
def trigger_company_history_export():
    company = g.current_company
    company_email = company.user.email if company.user else None

    task = export_company_history_csv.delay(company.id, company_email)

    return jsonify({
        "message": "Company history export started",
        "task_id": task.id
    }), 202


@company_bp.route("/exports/status/<task_id>", methods=["GET"])
@company_required()
def company_export_status(task_id):
    task = export_company_history_csv.AsyncResult(task_id)

    payload = {
        "task_id": task.id,
        "state": task.state
    }

    if task.state == "SUCCESS":
        payload["result"] = task.result
    elif task.state == "FAILURE":
        payload["error"] = str(task.info)

    return jsonify(payload), 200


@company_bp.route("/exports/download", methods=["GET"])
@company_required()
def download_company_export():
    filename = secure_filename(request.args.get("filename", "").strip())
    if not filename:
        return jsonify({"message": "filename is required"}), 400

    export_folder = current_app.config.get(
        "EXPORTS_FOLDER",
        os.path.join(os.getcwd(), "generated_exports")
    )

    file_path = os.path.join(export_folder, filename)
    if not os.path.exists(file_path):
        return jsonify({"message": "Export file not found"}), 404

    response = send_from_directory(export_folder, filename, as_attachment=True)
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


@company_bp.route("/reports/monthly", methods=["POST"])
@company_required()
def trigger_monthly_report():
    company = g.current_company
    data = request.get_json(silent=True) or {}

    month = data.get("month")
    year = data.get("year")
    company_email = company.user.email if company.user else None

    task = generate_company_monthly_report.delay(company.id, company_email, month, year)

    return jsonify({
        "message": "Monthly report generation started",
        "task_id": task.id
    }), 202


@company_bp.route("/reports/status/<task_id>", methods=["GET"])
@company_required()
def report_status(task_id):
    task = generate_company_monthly_report.AsyncResult(task_id)

    payload = {
        "task_id": task.id,
        "state": task.state
    }

    if task.state == "SUCCESS":
        payload["result"] = task.result
    elif task.state == "FAILURE":
        payload["error"] = str(task.info)

    return jsonify(payload), 200


@company_bp.route("/reports/download", methods=["GET"])
@company_required()
def download_report():
    filename = secure_filename(request.args.get("filename", "").strip())
    if not filename:
        return jsonify({"message": "filename is required"}), 400

    reports_folder = current_app.config.get(
        "REPORTS_FOLDER",
        os.path.join(os.getcwd(), "generated_reports")
    )

    file_path = os.path.join(reports_folder, filename)
    if not os.path.exists(file_path):
        return jsonify({"message": "Report file not found"}), 404

    response = send_from_directory(reports_folder, filename, as_attachment=True)
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


@company_bp.route("/students/<int:student_id>/resume", methods=["GET"])
@company_required()
def view_student_resume(student_id):
    company = g.current_company
    student = Student.query.get_or_404(student_id)

    if not student.resume_path:
        return jsonify({"message": "No resume uploaded for this student"}), 404

    related_application = (
        Application.query
        .join(JobPosition)
        .filter(
            Application.student_id == student.id,
            JobPosition.company_id == company.id
        )
        .first()
    )

    if not related_application:
        return jsonify({"message": "You are not authorized to view this student's resume"}), 403

    upload_folder = current_app.config.get("UPLOAD_FOLDER")
    if not upload_folder:
        return jsonify({"message": "Upload folder is not configured"}), 500

    file_path = os.path.join(upload_folder, student.resume_path)
    if not os.path.exists(file_path):
        return jsonify({"message": "Resume file not found"}), 404

    response = send_from_directory(
        upload_folder,
        student.resume_path,
        as_attachment=False
    )
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response