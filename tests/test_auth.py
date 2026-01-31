async def test_register_and_login(client):
    resp = await client.post(
        "/api/auth/register",
        json={"username": "testuser", "password": "testpass123"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["username"] == "testuser"
    assert data["is_admin"] is False

    resp = await client.post(
        "/api/auth/login",
        data={"username": "testuser", "password": "testpass123"},
    )
    assert resp.status_code == 200
    token_data = resp.json()
    assert "access_token" in token_data


async def test_login_invalid(client):
    resp = await client.post(
        "/api/auth/login",
        data={"username": "nobody", "password": "wrong"},
    )
    assert resp.status_code == 401
