import os
import sys
import tempfile
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from app import app as flask_app, db
from models.models import User, Student, Company, JobPosition, Application, Placement


@pytest.fixture()
def app():
    flask_app.config.update({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
    })
    with flask_app.app_context():
        db.create_all()
        yield flask_app
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


def register_and_login(client, role, username, email, password="test1234", extra=None):
    body = {"username": username, "email": email, "password": password}
    if extra:
        body.update(extra)
    client.post(f"/api/auth/register/{role}", json=body)
    resp = client.post("/api/auth/login", json={"username": username, "password": password})
    return resp.get_json()


@pytest.fixture()
def admin_headers(app, client):
    with app.app_context():
        admin = User(username="admin_test", email="admin_test@test.com", role="admin",
                     is_active=True, is_approved=True)
        admin.set_password("test1234")
        db.session.add(admin)
        db.session.commit()
    resp = client.post("/api/auth/login", json={"username": "admin_test", "password": "test1234"})
    token = resp.get_json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def student_headers(client):
    data = register_and_login(client, "student", "student_test", "student_test@test.com",
                               extra={"name": "Test Student", "department": "CSE"})
    token = data["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def company_headers(app, client):
    client.post("/api/auth/register/company", json={
        "username": "company_test", "email": "company_test@test.com",
        "password": "test1234", "name": "TestCo", "industry": "Tech"
    })
    with app.app_context():
        user = User.query.filter_by(username="company_test").first()
        user.is_approved = True
        db.session.commit()
    resp = client.post("/api/auth/login", json={"username": "company_test", "password": "test1234"})
    token = resp.get_json()["access_token"]
    return {"Authorization": f"Bearer {token}"}