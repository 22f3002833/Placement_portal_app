import os
import csv
from io import StringIO
from datetime import datetime

from celery import Celery
from celery.schedules import crontab
from flask import Flask
from flask_mail import Mail, Message
from sqlalchemy import create_engine, text


def make_celery(app_name=__name__):
    celery = Celery(
        app_name,
        broker="redis://localhost:6379/0",
        backend="redis://localhost:6379/0"
    )
    celery.conf.update(
        timezone="Asia/Kolkata",
        enable_utc=False,
        beat_schedule={
            "monthly-company-placement-reports": {
                "task": "celery_tasks.generate_all_company_monthly_reports",
                "schedule": crontab(hour=0, minute=5, day_of_month=1),
            }
        }
    )
    return celery


celery_app = make_celery()

base_dir = os.path.abspath(os.path.dirname(__file__))
default_db_path = os.path.join(base_dir, "placement.db")

flask_app = Flask(__name__)
flask_app.config.update(
    MAIL_SERVER="smtp.gmail.com",
    MAIL_PORT=587,
    MAIL_USE_TLS=True,
    MAIL_USE_SSL=False,
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
    MAIL_DEFAULT_SENDER=os.getenv("MAIL_DEFAULT_SENDER"),
    DATABASE_URL=os.getenv("DATABASE_URL", f"sqlite:///{default_db_path}"),
    REPORTS_FOLDER=os.getenv("REPORTS_FOLDER", os.path.join(base_dir, "generated_reports")),
    EXPORTS_FOLDER=os.getenv("EXPORTS_FOLDER", os.path.join(base_dir, "generated_exports")),
)

mail = Mail(flask_app)
engine = create_engine(flask_app.config["DATABASE_URL"], future=True)

os.makedirs(flask_app.config["REPORTS_FOLDER"], exist_ok=True)
os.makedirs(flask_app.config["EXPORTS_FOLDER"], exist_ok=True)


def send_email(recipient, subject, body):
    if not recipient:
        return

    if not flask_app.config.get("MAIL_USERNAME"):
        raise ValueError("MAIL_USERNAME is not set in environment variables")
    if not flask_app.config.get("MAIL_PASSWORD"):
        raise ValueError("MAIL_PASSWORD is not set in environment variables")
    if not flask_app.config.get("MAIL_DEFAULT_SENDER"):
        raise ValueError("MAIL_DEFAULT_SENDER is not set in environment variables")

    with flask_app.app_context():
        msg = Message(subject=subject, recipients=[recipient], body=body)
        mail.send(msg)


def normalize_month_year(month=None, year=None):
    now = datetime.now()

    month = int(month) if month not in [None, ""] else now.month
    year = int(year) if year not in [None, ""] else now.year

    if month < 1 or month > 12:
        raise ValueError("month must be between 1 and 12")

    return month, year


@celery_app.task(name="celery_tasks.send_interview_reminder")
def send_interview_reminder(student_email, student_name, company_name, interview_date):
    if not student_email:
        raise ValueError("student_email is required")

    send_email(
        student_email,
        f"Interview Reminder - {company_name}",
        (
            f"Hi {student_name},\n\n"
            f"This is a reminder that your interview with {company_name} "
            f"is scheduled on {interview_date}.\n\n"
            f"Good luck!\n"
            f"Placement Portal Team"
        )
    )

    return f"Reminder sent to {student_email}"


@celery_app.task(name="celery_tasks.generate_company_monthly_report")
def generate_company_monthly_report(company_id, company_email=None, month=None, year=None):
    month, year = normalize_month_year(month, year)

    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month + 1, 1)

    with engine.connect() as conn:
        company_row = conn.execute(
            text("SELECT id, name FROM company WHERE id = :company_id"),
            {"company_id": company_id}
        ).mappings().first()

        if not company_row:
            raise ValueError(f"Company {company_id} not found")

        jobs_count = conn.execute(
            text("""
                SELECT COUNT(*) AS total_jobs
                FROM job_position
                WHERE company_id = :company_id
            """),
            {"company_id": company_id}
        ).scalar() or 0

        applications_count = conn.execute(
            text("""
                SELECT COUNT(a.id) AS total_applications
                FROM application a
                JOIN job_position j ON a.job_id = j.id
                WHERE j.company_id = :company_id
                  AND a.created_at >= :start_date
                  AND a.created_at < :end_date
            """),
            {
                "company_id": company_id,
                "start_date": start_date,
                "end_date": end_date
            }
        ).scalar() or 0

        status_rows = conn.execute(
            text("""
                SELECT a.status, COUNT(a.id) AS total
                FROM application a
                JOIN job_position j ON a.job_id = j.id
                WHERE j.company_id = :company_id
                  AND a.created_at >= :start_date
                  AND a.created_at < :end_date
                GROUP BY a.status
            """),
            {
                "company_id": company_id,
                "start_date": start_date,
                "end_date": end_date
            }
        ).mappings().all()

        placements_count = conn.execute(
            text("""
                SELECT COUNT(p.id) AS total_placements
                FROM placement p
                WHERE p.company_id = :company_id
                  AND p.created_at >= :start_date
                  AND p.created_at < :end_date
            """),
            {
                "company_id": company_id,
                "start_date": start_date,
                "end_date": end_date
            }
        ).scalar() or 0

        avg_salary = conn.execute(
            text("""
                SELECT AVG(p.salary) AS avg_salary
                FROM placement p
                WHERE p.company_id = :company_id
                  AND p.created_at >= :start_date
                  AND p.created_at < :end_date
            """),
            {
                "company_id": company_id,
                "start_date": start_date,
                "end_date": end_date
            }
        ).scalar()

    status_map = {row["status"]: row["total"] for row in status_rows}
    company_name = company_row["name"]
    month_label = f"{year}-{month:02d}"

    html = f"""
    <html>
    <head>
        <title>Placement Report - {company_name} - {month_label}</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 30px; color: #222; }}
            h1, h2 {{ color: #0d6efd; }}
            table {{ border-collapse: collapse; width: 100%; margin-top: 20px; }}
            th, td {{ border: 1px solid #ddd; padding: 10px; text-align: left; }}
            th {{ background: #f5f5f5; }}
            .meta {{ margin-bottom: 20px; }}
        </style>
    </head>
    <body>
        <h1>Monthly Placement Report</h1>
        <div class="meta">
            <p><strong>Company:</strong> {company_name}</p>
            <p><strong>Month:</strong> {month_label}</p>
            <p><strong>Generated At:</strong> {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</p>
        </div>

        <h2>Summary</h2>
        <table>
            <tr><th>Total Jobs</th><td>{jobs_count}</td></tr>
            <tr><th>Total Applications</th><td>{applications_count}</td></tr>
            <tr><th>Total Placements</th><td>{placements_count}</td></tr>
            <tr><th>Average Placement Salary</th><td>{round(avg_salary, 2) if avg_salary is not None else "N/A"}</td></tr>
        </table>

        <h2>Application Status Breakdown</h2>
        <table>
            <tr><th>Status</th><th>Count</th></tr>
            <tr><td>Applied</td><td>{status_map.get("Applied", 0)}</td></tr>
            <tr><td>Shortlisted</td><td>{status_map.get("Shortlisted", 0)}</td></tr>
            <tr><td>Interview</td><td>{status_map.get("Interview", 0)}</td></tr>
            <tr><td>Offer</td><td>{status_map.get("Offer", 0)}</td></tr>
            <tr><td>Rejected</td><td>{status_map.get("Rejected", 0)}</td></tr>
            <tr><td>Placed</td><td>{status_map.get("Placed", 0)}</td></tr>
        </table>
    </body>
    </html>
    """

    filename = f"company_{company_id}_report_{month_label}.html"
    filepath = os.path.join(flask_app.config["REPORTS_FOLDER"], filename)

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(html)

    if company_email:
        send_email(
            company_email,
            f"Monthly Placement Report Ready - {month_label}",
            f"Hello,\n\nYour monthly placement report for {month_label} is ready.\nFile: {filename}\n\nPlacement Portal Team"
        )

    return {"message": "Report generated", "file": filename, "path": filepath}


@celery_app.task(name="celery_tasks.generate_all_company_monthly_reports")
def generate_all_company_monthly_reports():
    generated = []

    with engine.connect() as conn:
        companies = conn.execute(
            text("""
                SELECT c.id, c.name, u.email
                FROM company c
                JOIN user u ON c.user_id = u.id
                WHERE u.is_active = 1 AND u.is_approved = 1
            """)
        ).mappings().all()

    for company in companies:
        result = generate_company_monthly_report.delay(
            company_id=company["id"],
            company_email=company["email"]
        )
        generated.append({
            "company_id": company["id"],
            "task_id": result.id
        })

    return generated


@celery_app.task(name="celery_tasks.export_student_history_csv")
def export_student_history_csv(student_id, student_email=None):
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "application_id", "job_title", "company_name", "status",
        "interview_datetime", "placement_position", "placement_salary", "applied_at"
    ])

    with engine.connect() as conn:
        rows = conn.execute(
            text("""
                SELECT
                    a.id AS application_id,
                    j.title AS job_title,
                    c.name AS company_name,
                    a.status AS status,
                    a.interview_datetime AS interview_datetime,
                    p.position AS placement_position,
                    p.salary AS placement_salary,
                    a.created_at AS applied_at
                FROM application a
                JOIN job_position j ON a.job_id = j.id
                JOIN company c ON j.company_id = c.id
                LEFT JOIN placement p ON p.application_id = a.id
                WHERE a.student_id = :student_id
                ORDER BY a.created_at DESC
            """),
            {"student_id": student_id}
        ).mappings().all()

    for row in rows:
        writer.writerow([
            row["application_id"],
            row["job_title"],
            row["company_name"],
            row["status"],
            row["interview_datetime"],
            row["placement_position"],
            row["placement_salary"],
            row["applied_at"],
        ])

    filename = f"student_{student_id}_history_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    filepath = os.path.join(flask_app.config["EXPORTS_FOLDER"], filename)

    with open(filepath, "w", newline="", encoding="utf-8") as f:
        f.write(output.getvalue())

    if student_email:
        send_email(
            student_email,
            "Your student application history export is ready",
            f"Hello,\n\nYour CSV export has been generated successfully.\nFile: {filename}\n\nPlacement Portal Team"
        )

    return {"message": "Student CSV generated", "file": filename, "path": filepath}


@celery_app.task(name="celery_tasks.export_company_history_csv")
def export_company_history_csv(company_id, company_email=None):
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "application_id", "student_id", "student_name", "job_title", "status",
        "interview_datetime", "placement_position", "placement_salary", "applied_at"
    ])

    with engine.connect() as conn:
        rows = conn.execute(
            text("""
                SELECT
                    a.id AS application_id,
                    s.id AS student_id,
                    s.name AS student_name,
                    j.title AS job_title,
                    a.status AS status,
                    a.interview_datetime AS interview_datetime,
                    p.position AS placement_position,
                    p.salary AS placement_salary,
                    a.created_at AS applied_at
                FROM application a
                JOIN student s ON a.student_id = s.id
                JOIN job_position j ON a.job_id = j.id
                LEFT JOIN placement p ON p.application_id = a.id
                WHERE j.company_id = :company_id
                ORDER BY a.created_at DESC
            """),
            {"company_id": company_id}
        ).mappings().all()

    for row in rows:
        writer.writerow([
            row["application_id"],
            row["student_id"],
            row["student_name"],
            row["job_title"],
            row["status"],
            row["interview_datetime"],
            row["placement_position"],
            row["placement_salary"],
            row["applied_at"],
        ])

    filename = f"company_{company_id}_history_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    filepath = os.path.join(flask_app.config["EXPORTS_FOLDER"], filename)

    with open(filepath, "w", newline="", encoding="utf-8") as f:
        f.write(output.getvalue())

    if company_email:
        send_email(
            company_email,
            "Your company application history export is ready",
            f"Hello,\n\nYour CSV export has been generated successfully.\nFile: {filename}\n\nPlacement Portal Team"
        )

    return {"message": "Company CSV generated", "file": filename, "path": filepath}