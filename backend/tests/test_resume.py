import io

def test_upload_and_download_own_resume(client, student_headers):
    data = {"resume": (io.BytesIO(b"Test resume content"), "resume.pdf")}
    resp = client.post("/api/student/resume/upload", data=data,
                        headers=student_headers, content_type="multipart/form-data")
    assert resp.status_code == 200

    resp = client.get("/api/student/resume", headers=student_headers)
    assert resp.status_code == 200
    assert resp.data == b"Test resume content"

def test_no_resume_uploaded_returns_404(client, student_headers):
    resp = client.get("/api/student/resume", headers=student_headers)
    assert resp.status_code == 404

def test_company_cannot_be_accessed_by_student_role(client, student_headers):
    resp = client.get("/api/company/students/1/resume", headers=student_headers)
    assert resp.status_code == 403

def test_no_auth_header_rejected(client):
    resp = client.get("/api/company/students/1/resume")
    assert resp.status_code == 401