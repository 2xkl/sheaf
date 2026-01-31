import io


async def _register_and_get_token(client) -> str:
    await client.post(
        "/api/auth/register",
        json={"username": "docuser", "password": "docpass123"},
    )
    resp = await client.post(
        "/api/auth/login",
        data={"username": "docuser", "password": "docpass123"},
    )
    return resp.json()["access_token"]


async def test_upload_requires_auth(client):
    resp = await client.post("/api/documents/upload")
    assert resp.status_code == 401


async def test_upload_and_list(client):
    token = await _register_and_get_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    pdf_bytes = b"%PDF-1.4 fake content"
    resp = await client.post(
        "/api/documents/upload",
        headers=headers,
        files={"file": ("test.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
    )
    assert resp.status_code == 201
    doc = resp.json()
    assert doc["original_name"] == "test.pdf"

    resp = await client.get("/api/documents/", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1


async def test_upload_rejects_non_pdf(client):
    token = await _register_and_get_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post(
        "/api/documents/upload",
        headers=headers,
        files={"file": ("test.txt", io.BytesIO(b"hello"), "text/plain")},
    )
    assert resp.status_code == 400
