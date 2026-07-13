import io

from models.models import Application, JobPosition, Student


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


def test_full_application_lifecycle(client, app, company_headers, student_headers, monkeypatch):
    monkeypatch.setattr("routes.company.send_interview_reminder.delay", lambda **kwargs: None)

    upload_test_resume(client, student_headers)

    job_resp = client.post(
        "/api/company/jobs",
        json={
            "title": "Backend Dev",
            "description": "Flask role",
            "salary": 700000
        },
        headers=company_headers
    )
    assert job_resp.status_code == 201, job_resp.get_json()
    job_id = job_resp.get_json()["job"]["id"]

    apply_resp = client.post(f"/api/student/apply/{job_id}", headers=student_headers)
    assert apply_resp.status_code == 201, apply_resp.get_json()

    app_id = get_created_application_id(app, job_id)

    dup_resp = client.post(f"/api/student/apply/{job_id}", headers=student_headers)
    assert dup_resp.status_code == 400, dup_resp.get_json()

    status_resp = client.patch(
        f"/api/company/applications/{app_id}/status",
        json={"status": "Shortlisted"},
        headers=company_headers
    )
    assert status_resp.status_code == 200, status_resp.get_json()

    invalid_resp = client.patch(
        f"/api/company/applications/{app_id}/status",
        json={"status": "Bogus"},
        headers=company_headers
    )
    assert invalid_resp.status_code == 400, invalid_resp.get_json()

    finalize_resp = client.post(
        f"/api/company/applications/{app_id}/finalize",
        json={
            "position": "Backend Dev",
            "salary": 700000
        },
        headers=company_headers
    )
    assert finalize_resp.status_code == 201, finalize_resp.get_json()

    dup_finalize = client.post(
        f"/api/company/applications/{app_id}/finalize",
        json={},
        headers=company_headers
    )
    assert dup_finalize.status_code == 400, dup_finalize.get_json()