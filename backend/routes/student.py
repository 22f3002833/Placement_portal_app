from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from extensions import db
from models.models import Student, JobPosition, Application

student_bp = Blueprint('student', __name__, url_prefix='/api/student')


def check_student():
    claims = get_jwt()
    return claims.get('role') == 'student'


def get_student_profile():
    uid = get_jwt_identity()
    return Student.query.filter_by(user_id=uid).first()


@student_bp.route('/jobs', methods=['GET'])
@jwt_required()
def list_jobs():
    if not check_student():
        return jsonify({'message': 'Forbidden'}), 403
    jobs = JobPosition.query.filter_by(status='Active').all()
    result = []
    for j in jobs:
        result.append({
            'id': j.id,
            'title': j.title,
            'description': j.description,
            'salary': j.salary,
            'company_name': j.company.name,
        })
    return jsonify(result)


@student_bp.route('/apply/<int:job_id>', methods=['POST'])
@jwt_required()
def apply(job_id):
    if not check_student():
        return jsonify({'message': 'Forbidden'}), 403
    student = get_student_profile()
    job = JobPosition.query.get_or_404(job_id)

    if job.status != 'Active':
        return jsonify({'message': 'Job not open for applications'}), 400

    existing = Application.query.filter_by(student_id=student.id, job_id=job_id).first()
    if existing:
        return jsonify({'message': 'Already applied to this job'}), 400

    application = Application(student_id=student.id, job_id=job_id)
    db.session.add(application)
    db.session.commit()
    return jsonify({'message': 'Applied successfully', 'application_id': application.id}), 201


@student_bp.route('/applications', methods=['GET'])
@jwt_required()
def my_applications():
    if not check_student():
        return jsonify({'message': 'Forbidden'}), 403
    student = get_student_profile()
    apps = Application.query.filter_by(student_id=student.id).all()
    result = []
    for a in apps:
        result.append({
            'id': a.id,
            'job_title': a.job.title,
            'company_name': a.job.company.name,
            'status': a.status,
        })
    return jsonify(result)

@student_bp.route('/placements', methods=['GET'])
@jwt_required()
def my_placements():
    if not check_student():
        return jsonify({'message': 'Forbidden'}), 403
    from models.models import Placement
    student = get_student_profile()
    placements = Placement.query.filter_by(student_id=student.id).all()
    result = []
    for p in placements:
        result.append({
            'id': p.id,
            'position': p.position,
            'salary': p.salary,
            'company_id': p.company_id,
        })
    return jsonify(result)

