def test_stats_requires_admin(client, student_headers):
    resp = client.get("/api/admin/stats", headers=student_headers)
    assert resp.status_code == 403

def test_stats_as_admin(client, admin_headers):
    resp = client.get("/api/admin/stats", headers=admin_headers)
    assert resp.status_code == 200
    body = resp.get_json()
    assert "total_students" in body

def test_approve_pending_company(client, admin_headers):
    client.post("/api/auth/register/company", json={
        "username": "co2", "email": "co2@test.com",
        "password": "test1234", "name": "Co2", "industry": "Tech"
    })
    pending = client.get("/api/admin/companies/pending", headers=admin_headers).get_json()
    company_id = pending[0]["id"]

    resp = client.patch(f"/api/admin/companies/{company_id}/approve", headers=admin_headers)
    assert resp.status_code == 200

    login_resp = client.post("/api/auth/login", json={"username": "co2", "password": "test1234"})
    assert login_resp.status_code == 200

def test_blacklist_toggle(client, admin_headers, student_headers):
    students = client.get("/api/admin/students", headers=admin_headers).get_json()
    user_id = students[0]["user_id"]

    client.patch(f"/api/admin/users/{user_id}/blacklist", headers=admin_headers)
    resp = client.post("/api/auth/login", json={"username": "student_test", "password": "test1234"})
    assert resp.status_code != 200

    client.patch(f"/api/admin/users/{user_id}/blacklist", headers=admin_headers)
    resp = client.post("/api/auth/login", json={"username": "student_test", "password": "test1234"})
    assert resp.status_code == 200