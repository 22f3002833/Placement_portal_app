from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from extensions import db
from models.models import User, Company, Student, JobPosition, Application

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')


def check_admin():
    claims = get_jwt()
    return claims.get('role') == 'admin'


@admin_bp.route('/stats', methods=['GET'])
@jwt_required()
def stats():
    if not check_admin():
        return jsonify({'message': 'Forbidden'}), 403
    return jsonify({
        'total_students': Student.query.count(),
        'total_companies': Company.query.count(),
        'total_jobs': JobPosition.query.count(),
        'total_applications': Application.query.count(),
    })


@admin_bp.route('/companies', methods=['GET'])
@jwt_required()
def get_companies():
    if not check_admin():
        return jsonify({'message': 'Forbidden'}), 403
    companies = Company.query.all()
    result = []
    for c in companies:
        result.append({
            'id': c.id,
            'user_id': c.user_id,
            'name': c.name,
            'industry': c.industry,
            'is_approved': c.user.is_approved,
            'is_active': c.user.is_active,
        })
    return jsonify(result)


@admin_bp.route('/companies/<int:company_id>/approve', methods=['PATCH'])
@jwt_required()
def approve_company(company_id):
    if not check_admin():
        return jsonify({'message': 'Forbidden'}), 403
    company = Company.query.get_or_404(company_id)
    company.user.is_approved = True
    db.session.commit()
    return jsonify({'message': 'Company approved'})


@admin_bp.route('/students', methods=['GET'])
@jwt_required()
def get_students():
    if not check_admin():
        return jsonify({'message': 'Forbidden'}), 403
    students = Student.query.all()
    result = []
    for s in students:
        result.append({
            'id': s.id,
            'user_id': s.user_id,
            'name': s.name,
            'department': s.department,
            'is_active': s.user.is_active,
        })
    return jsonify(result)


@admin_bp.route('/users/<int:user_id>/blacklist', methods=['PATCH'])
@jwt_required()
def toggle_blacklist(user_id):
    if not check_admin():
        return jsonify({'message': 'Forbidden'}), 403
    user = User.query.get_or_404(user_id)
    user.is_active = not user.is_active
    db.session.commit()
    return jsonify({'message': f'User is_active set to {user.is_active}'})