import io

from extensions import db
from models.models import Application, Company, User


def upload_test_resume(client, student_headers):
    resp = client.post(
        "/api/student/resume/upload",
        data={
            "resume": (io.BytesIO(b"dummy resume content"), "resume.pdf")
        },
        headers=student_headers,
        content_type="multipart/form-data"
    )
    assert resp.status_code in [200, 201], resp.get_json()


def get_created_application_id(app, job_id):
    with app.app_context():
        application = Application.query.filter_by(job_id=job_id).order_by(Application.id.desc()).first()
        assert application is not None, "Application was not created in database"
        return application.id


def create_job_and_apply(client, company_headers, student_headers, status="Active"):
    upload_test_resume(client, student_headers)

    job_resp = client.post(
        "/api/company/jobs",
        json={
            "title": "Edge Case Job",
            "description": "Test",
            "salary": 500000,
            "status": status
        },
        headers=company_headers
    )
    assert job_resp.status_code == 201, job_resp.get_json()
    job_data = job_resp.get_json()
    job_id = job_data["job"]["id"]

    apply_resp = client.post(f"/api/student/apply/{job_id}", headers=student_headers)
    return job_id, apply_resp


class TestNonexistentResources:
    def test_apply_to_nonexistent_job(self, client, student_headers):
        upload_test_resume(client, student_headers)
        resp = client.post("/api/student/apply/99999", headers=student_headers)
        assert resp.status_code in [400, 404]

    def test_update_status_nonexistent_application(self, client, company_headers):
        resp = client.patch(
            "/api/company/applications/99999/status",
            json={"status": "Shortlisted"},
            headers=company_headers
        )
        assert resp.status_code == 404

    def test_finalize_nonexistent_application(self, client, company_headers):
        resp = client.post(
            "/api/company/applications/99999/finalize",
            json={"position": "X", "salary": 1},
            headers=company_headers
        )
        assert resp.status_code == 404

    def test_view_applications_for_nonexistent_job(self, client, company_headers):
        resp = client.get("/api/company/jobs/99999/applications", headers=company_headers)
        assert resp.status_code == 404

    def test_update_nonexistent_job(self, client, company_headers):
        resp = client.patch(
            "/api/company/jobs/99999",
            json={"title": "New"},
            headers=company_headers
        )
        assert resp.status_code == 404

    def test_blacklist_nonexistent_user(self, client, admin_headers):
        resp = client.patch("/api/admin/users/99999/blacklist", headers=admin_headers)
        assert resp.status_code == 404

    def test_approve_nonexistent_company(self, client, admin_headers):
        resp = client.patch("/api/admin/companies/99999/approve", headers=admin_headers)
        assert resp.status_code == 404


class TestCrossRoleAccess:
    def test_student_cannot_create_job(self, client, student_headers):
        resp = client.post(
            "/api/company/jobs",
            json={"title": "Hack", "description": "Nope"},
            headers=student_headers
        )
        assert resp.status_code == 403

    def test_company_cannot_apply_to_job(self, client, company_headers):
        resp = client.post("/api/student/apply/1", headers=company_headers)
        assert resp.status_code == 403

    def test_company_cannot_access_admin_stats(self, client, company_headers):
        resp = client.get("/api/admin/stats", headers=company_headers)
        assert resp.status_code == 403

    def test_student_cannot_access_admin_students_list(self, client, student_headers):
        resp = client.get("/api/admin/students", headers=student_headers)
        assert resp.status_code == 403

    def test_company_cannot_blacklist_users(self, client, company_headers):
        resp = client.patch("/api/admin/users/1/blacklist", headers=company_headers)
        assert resp.status_code == 403


class TestOwnershipIsolation:
    def test_company_cannot_view_other_companys_job_applications(
        self, client, company_headers, student_headers, app
    ):
        job_id, apply_resp = create_job_and_apply(client, company_headers, student_headers)
        assert apply_resp.status_code == 201, apply_resp.get_json()

        with app.app_context():
            other_user = User(
                username="othercompany",
                email="othercompany@example.com",
                role="company",
                is_approved=True
            )
            other_user.set_password("password123")
            db.session.add(other_user)
            db.session.commit()

            other_company = Company(
                user_id=other_user.id,
                name="Other Company",
                contact_email="othercompany@example.com"
            )
            db.session.add(other_company)
            db.session.commit()

        login_resp = client.post(
            "/api/auth/login",
            json={"username": "othercompany", "password": "password123"}
        )
        assert login_resp.status_code == 200, login_resp.get_json()
        other_headers = {"Authorization": f"Bearer {login_resp.get_json()['access_token']}"}

        resp = client.get(f"/api/company/jobs/{job_id}/applications", headers=other_headers)
        assert resp.status_code in [403, 404], resp.get_json()

    def test_company_cannot_update_status_on_other_companys_application(
        self, client, company_headers, student_headers, app
    ):
        job_id, apply_resp = create_job_and_apply(client, company_headers, student_headers)
        assert apply_resp.status_code == 201, apply_resp.get_json()
        app_id = get_created_application_id(app, job_id)

        with app.app_context():
            other_user = User(
                username="othercompany2",
                email="othercompany2@example.com",
                role="company",
                is_approved=True
            )
            other_user.set_password("password123")
            db.session.add(other_user)
            db.session.commit()

            other_company = Company(
                user_id=other_user.id,
                name="Other Company 2",
                contact_email="othercompany2@example.com"
            )
            db.session.add(other_company)
            db.session.commit()

        login_resp = client.post(
            "/api/auth/login",
            json={"username": "othercompany2", "password": "password123"}
        )
        assert login_resp.status_code == 200, login_resp.get_json()
        other_headers = {"Authorization": f"Bearer {login_resp.get_json()['access_token']}"}

        resp = client.patch(
            f"/api/company/applications/{app_id}/status",
            json={"status": "Shortlisted"},
            headers=other_headers
        )
        assert resp.status_code == 403, resp.get_json()


class TestBusinessRuleViolations:
    def test_cannot_apply_to_inactive_job(self, client, company_headers, student_headers):
        job_id, first_apply_resp = create_job_and_apply(
            client, company_headers, student_headers, status="Closed"
        )
        assert first_apply_resp.status_code == 400, first_apply_resp.get_json()

    def test_cannot_finalize_application_still_applied(
        self, client, company_headers, student_headers, app
    ):
        job_id, apply_resp = create_job_and_apply(client, company_headers, student_headers)
        assert apply_resp.status_code == 201, apply_resp.get_json()
        app_id = get_created_application_id(app, job_id)

        resp = client.post(
            f"/api/company/applications/{app_id}/finalize",
            json={"position": "Backend Dev", "salary": 700000},
            headers=company_headers
        )
        assert resp.status_code == 400, resp.get_json()

    def test_reject_status_is_valid(self, client, company_headers, student_headers, app):
        job_id, apply_resp = create_job_and_apply(client, company_headers, student_headers)
        assert apply_resp.status_code == 201, apply_resp.get_json()
        app_id = get_created_application_id(app, job_id)

        resp = client.patch(
            f"/api/company/applications/{app_id}/status",
            json={"status": "Rejected"},
            headers=company_headers
        )
        assert resp.status_code == 200, resp.get_json()


class TestAuthEdgeCases:
    def test_malformed_auth_header(self, client):
        resp = client.get("/api/admin/stats", headers={"Authorization": "BadToken"})
        assert resp.status_code in [401, 422]

    def test_duplicate_username_rejected(self, client):
        resp1 = client.post(
            "/api/auth/register/student",
            json={
                "username": "dupuser",
                "password": "password123",
                "name": "Dup User",
                "email": "dup1@example.com"
            }
        )
        assert resp1.status_code in [200, 201], resp1.get_json()

        resp2 = client.post(
            "/api/auth/register/student",
            json={
                "username": "dupuser",
                "password": "password123",
                "name": "Dup User 2",
                "email": "dup2@example.com"
            }
        )
        assert resp2.status_code == 400, resp2.get_json()

    def test_missing_email_rejected(self, client):
        resp = client.post(
            "/api/auth/register/student",
            json={
                "username": "nouseremail",
                "password": "password123",
                "name": "No Email User"
            }
        )
        assert resp.status_code == 400, resp.get_json()