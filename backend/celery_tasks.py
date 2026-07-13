import os
from celery import Celery
from flask import Flask
from flask_mail import Mail, Message


def make_celery(app_name=__name__):
    celery = Celery(
        app_name,
        broker="redis://localhost:6379/0",
        backend="redis://localhost:6379/0"
    )
    return celery


celery_app = make_celery()

flask_app = Flask(__name__)
flask_app.config.update(
    MAIL_SERVER="smtp.gmail.com",
    MAIL_PORT=587,
    MAIL_USE_TLS=True,
    MAIL_USE_SSL=False,
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
    MAIL_DEFAULT_SENDER=os.getenv("MAIL_DEFAULT_SENDER"),
)

mail = Mail(flask_app)


@celery_app.task(name="celery_tasks.send_interview_reminder")
def send_interview_reminder(student_email, student_name, company_name, interview_date):
    if not flask_app.config.get("MAIL_USERNAME"):
        raise ValueError("MAIL_USERNAME is not set in environment variables")

    if not flask_app.config.get("MAIL_PASSWORD"):
        raise ValueError("MAIL_PASSWORD is not set in environment variables")

    if not flask_app.config.get("MAIL_DEFAULT_SENDER"):
        raise ValueError("MAIL_DEFAULT_SENDER is not set in environment variables")

    if not student_email:
        raise ValueError("student_email is required")

    with flask_app.app_context():
        msg = Message(
            subject=f"Interview Reminder - {company_name}",
            recipients=[student_email],
            body=(
                f"Hi {student_name},\n\n"
                f"This is a reminder that your interview with {company_name} "
                f"is scheduled on {interview_date}.\n\n"
                f"Good luck!\n"
                f"Placement Portal Team"
            )
        )
        mail.send(msg)

    return f"Reminder sent to {student_email}"