from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from extensions import db
from models.models import Company, JobPosition, Application

company_bp = Blueprint('company', __name__, url_prefix='/api/company')


def check_company():
    claims = get_jwt()
    return claims.get('role') == 'company'


def get_company_profile():
    uid = get_jwt_identity()
    return Company.query.filter_by(user_id=uid).first()


@company_bp.route('/jobs', methods=['GET', 'POST'])
@jwt_required()
def jobs():
    if not check_company():
        return jsonify({'message': 'Forbidden'}), 403
    company = get_company_profile()

    if request.method == 'GET':
        jobs = JobPosition.query.filter_by(company_id=company.id).all()
        result = []
        for j in jobs:
            result.append({
                'id': j.id,
                'title': j.title,
                'description': j.description,
                'salary': j.salary,
                'status': j.status,
            })
        return jsonify(result)

    data = request.get_json()
    job = JobPosition(
        company_id=company.id,
        title=data['title'],
        description=data.get('description'),
        salary=data.get('salary'),
    )
    db.session.add(job)
    db.session.commit()
    return jsonify({'message': 'Job created', 'id': job.id}), 201


@company_bp.route('/jobs/<int:job_id>', methods=['PATCH'])
@jwt_required()
def update_job(job_id):
    if not check_company():
        return jsonify({'message': 'Forbidden'}), 403
    company = get_company_profile()
    job = JobPosition.query.filter_by(id=job_id, company_id=company.id).first_or_404()
    data = request.get_json()
    if 'status' in data:
        job.status = data['status']
    db.session.commit()
    return jsonify({'message': 'Job updated'})


@company_bp.route('/jobs/<int:job_id>/applications', methods=['GET'])
@jwt_required()
def job_applications(job_id):
    if not check_company():
        return jsonify({'message': 'Forbidden'}), 403
    company = get_company_profile()
    job = JobPosition.query.filter_by(id=job_id, company_id=company.id).first_or_404()
    apps = Application.query.filter_by(job_id=job.id).all()
    result = []
    for a in apps:
        result.append({
            'id': a.id,
            'student_name': a.student.name,
            'status': a.status,
        })
    return jsonify(result)


@company_bp.route('/applications/<int:app_id>/status', methods=['PATCH'])
@jwt_required()
def update_application_status(app_id):
    if not check_company():
        return jsonify({'message': 'Forbidden'}), 403
    company = get_company_profile()
    app_obj = Application.query.get_or_404(app_id)
    if app_obj.job.company_id != company.id:
        return jsonify({'message': 'Forbidden'}), 403
    data = request.get_json()
    app_obj.status = data.get('status', app_obj.status)
    db.session.commit()
    return jsonify({'message': 'Application status updated'})