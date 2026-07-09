from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from extensions import db
from models.models import User, Company, Student

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/register/student', methods=['POST'])
def register_student():
    data = request.get_json()
    if User.query.filter_by(username=data.get('username')).first():
        return jsonify({'message': 'Username already exists'}), 400

    user = User(username=data['username'], role='student', is_active=True, is_approved=True)
    user.set_password(data['password'])
    db.session.add(user)
    db.session.flush()

    student = Student(user_id=user.id, name=data.get('name'), department=data.get('department'))
    db.session.add(student)
    db.session.commit()
    return jsonify({'message': 'Student registered successfully'}), 201


@auth_bp.route('/register/company', methods=['POST'])
def register_company():
    data = request.get_json()
    if User.query.filter_by(username=data.get('username')).first():
        return jsonify({'message': 'Username already exists'}), 400

    user = User(username=data['username'], role='company', is_active=True, is_approved=False)
    user.set_password(data['password'])
    db.session.add(user)
    db.session.flush()

    company = Company(user_id=user.id, name=data.get('name'), industry=data.get('industry'))
    db.session.add(company)
    db.session.commit()
    return jsonify({'message': 'Company registered. Pending admin approval.'}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data.get('username')).first()

    if not user or not user.check_password(data.get('password', '')):
        return jsonify({'message': 'Invalid credentials'}), 401
    if not user.is_active:
        return jsonify({'message': 'Account blacklisted'}), 403
    if user.role == 'company' and not user.is_approved:
        return jsonify({'message': 'Company approval pending'}), 403

    token = create_access_token(identity=str(user.id), additional_claims={'role': user.role})
    return jsonify({'access_token': token, 'role': user.role, 'username': user.username})