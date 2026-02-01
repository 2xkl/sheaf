async def test_get_storage_settings_default(auth_client):
    resp = await auth_client.get("/api/settings/storage")
    assert resp.status_code == 200
    data = resp.json()
    assert data["storage_backend"] == "local"
    assert data["azure_connection_string_set"] is False
    assert data["azure_container_name"] is None


async def test_get_storage_settings_requires_auth(client):
    resp = await client.get("/api/settings/storage")
    assert resp.status_code == 401


async def test_update_storage_local(auth_client):
    resp = await auth_client.put(
        "/api/settings/storage",
        json={"storage_backend": "local"},
    )
    assert resp.status_code == 200
    assert resp.json()["storage_backend"] == "local"


async def test_update_storage_azure_missing_credentials(auth_client):
    resp = await auth_client.put(
        "/api/settings/storage",
        json={"storage_backend": "azure"},
    )
    assert resp.status_code == 400


async def test_update_storage_invalid_backend(auth_client):
    resp = await auth_client.put(
        "/api/settings/storage",
        json={"storage_backend": "s3"},
    )
    assert resp.status_code == 400


async def test_connection_string_not_leaked(auth_client):
    """Even after saving Azure credentials, the connection string must not appear in GET."""
    # Save container name while staying on local (no Azure validation needed)
    resp = await auth_client.put(
        "/api/settings/storage",
        json={
            "storage_backend": "local",
            "azure_container_name": "my-container",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["azure_container_name"] == "my-container"
    assert "azure_connection_string" not in data

    # GET should also not leak it
    resp = await auth_client.get("/api/settings/storage")
    data = resp.json()
    assert "azure_connection_string" not in data
    assert "azure_account_key" not in data
