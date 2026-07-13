from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

from extensions import db


class TimestampMixin:
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
        index=True
    )


class User(TimestampMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False, index=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False, index=True)
    is_approved = db.Column(db.Boolean, default=False, nullable=False, index=True)

    __table_args__ = (
        db.CheckConstraint(
            "role in ('admin', 'company', 'student')",
            name="ck_users_role"
        ),
    )

    company = db.relationship(
        "Company",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan"
    )

    student = db.relationship(
        "Student",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan"
    )

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    @property
    def display_name(self):
        if self.role == "student" and self.student:
            return self.student.name or self.username
        if self.role == "company" and self.company:
            return self.company.name or self.username
        return self.username

    def __repr__(self):
        return f"<User {self.username} ({self.role})>"


class Company(TimestampMixin, db.Model):
    __tablename__ = "companies"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        unique=True,
        index=True
    )

    name = db.Column(db.String(120), nullable=False, index=True)
    industry = db.Column(db.String(120), index=True)
    location = db.Column(db.String(120), index=True)
    description = db.Column(db.Text)
    website = db.Column(db.String(255))
    contact_person = db.Column(db.String(120))
    contact_email = db.Column(db.String(120), index=True)
    contact_phone = db.Column(db.String(30))

    user = db.relationship("User", back_populates="company")

    jobs = db.relationship(
        "JobPosition",
        back_populates="company",
        cascade="all, delete-orphan",
        lazy=True
    )

    placements = db.relationship(
        "Placement",
        back_populates="company",
        cascade="all, delete-orphan",
        lazy=True
    )

    @property
    def is_available(self):
        return bool(self.user and self.user.is_active and self.user.is_approved)

    def __repr__(self):
        return f"<Company {self.name}>"


class Student(TimestampMixin, db.Model):
    __tablename__ = "students"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        unique=True,
        index=True
    )

    name = db.Column(db.String(120), nullable=False, index=True)
    student_id_code = db.Column(db.String(50), unique=True, index=True)
    department = db.Column(db.String(120), index=True)
    course = db.Column(db.String(120), index=True)
    year_of_study = db.Column(db.String(50), index=True)
    cgpa = db.Column(db.Float, index=True)
    skills = db.Column(db.Text)
    experience = db.Column(db.Text)
    contact_number = db.Column(db.String(30))
    resume_path = db.Column(db.String(300))
    profile_summary = db.Column(db.Text)

    user = db.relationship("User", back_populates="student")

    applications = db.relationship(
        "Application",
        back_populates="student",
        cascade="all, delete-orphan",
        lazy=True
    )

    placements = db.relationship(
        "Placement",
        back_populates="student",
        cascade="all, delete-orphan",
        lazy=True
    )

    @property
    def resume_uploaded(self):
        return bool(self.resume_path)

    def __repr__(self):
        return f"<Student {self.name}>"


class JobPosition(TimestampMixin, db.Model):
    __tablename__ = "job_positions"

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(
        db.Integer,
        db.ForeignKey("companies.id"),
        nullable=False,
        index=True
    )

    title = db.Column(db.String(150), nullable=False, index=True)
    description = db.Column(db.Text)
    skills_required = db.Column(db.Text)
    experience_required = db.Column(db.String(120))
    salary = db.Column(db.Float, index=True)
    benefits = db.Column(db.Text)
    location = db.Column(db.String(120), index=True)
    eligibility_criteria = db.Column(db.Text)
    application_deadline = db.Column(db.DateTime, index=True)
    status = db.Column(db.String(20), default="Active", nullable=False, index=True)

    __table_args__ = (
        db.CheckConstraint(
            "status in ('Active', 'Closed', 'Approved', 'Rejected')",
            name="ck_job_positions_status"
        ),
    )

    company = db.relationship("Company", back_populates="jobs")

    applications = db.relationship(
        "Application",
        back_populates="job",
        cascade="all, delete-orphan",
        lazy=True
    )

    def __repr__(self):
        return f"<JobPosition {self.title}>"

    @property
    def is_open(self):
        return self.status == "Active"


class Application(TimestampMixin, db.Model):
    __tablename__ = "applications"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(
        db.Integer,
        db.ForeignKey("students.id"),
        nullable=False,
        index=True
    )
    job_id = db.Column(
        db.Integer,
        db.ForeignKey("job_positions.id"),
        nullable=False,
        index=True
    )

    status = db.Column(
        db.String(30),
        default="Applied",
        nullable=False,
        index=True
    )

    feedback = db.Column(db.Text)
    interview_datetime = db.Column(db.DateTime, index=True)
    interview_mode = db.Column(db.String(50))
    interview_location = db.Column(db.String(255))
    interview_notes = db.Column(db.Text)

    __table_args__ = (
        db.UniqueConstraint("student_id", "job_id", name="uq_student_job"),
        db.CheckConstraint(
            "status in ('Applied', 'Shortlisted', 'Interview', 'Offer', 'Rejected', 'Placed')",
            name="ck_applications_status"
        ),
    )

    student = db.relationship("Student", back_populates="applications")
    job = db.relationship("JobPosition", back_populates="applications")

    placement = db.relationship(
        "Placement",
        back_populates="application",
        uselist=False,
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Application student={self.student_id} job={self.job_id} status={self.status}>"


class Placement(TimestampMixin, db.Model):
    __tablename__ = "placements"

    id = db.Column(db.Integer, primary_key=True)
    application_id = db.Column(
        db.Integer,
        db.ForeignKey("applications.id"),
        nullable=False,
        unique=True,
        index=True
    )
    student_id = db.Column(
        db.Integer,
        db.ForeignKey("students.id"),
        nullable=False,
        index=True
    )
    company_id = db.Column(
        db.Integer,
        db.ForeignKey("companies.id"),
        nullable=False,
        index=True
    )

    position = db.Column(db.String(150), nullable=False, index=True)
    salary = db.Column(db.Float, index=True)
    joining_date = db.Column(db.Date, index=True)
    offer_letter_path = db.Column(db.String(300))
    remarks = db.Column(db.Text)

    application = db.relationship("Application", back_populates="placement")
    student = db.relationship("Student", back_populates="placements")
    company = db.relationship("Company", back_populates="placements")

    def __repr__(self):
        return f"<Placement {self.position} student={self.student_id}>"