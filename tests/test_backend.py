from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def test_categories_are_available():
    response = client.get("/api/categories")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    assert response.json()


def test_players_crud_flow():
    response = client.get("/api/players")
    assert response.status_code == 200

    create = client.post("/api/players", json={"name": "Ana"})
    assert create.status_code == 200, create.text
    payload = create.json()
    assert payload["name"] == "Ana"
    assert "id" in payload

    duplicate = client.post("/api/players", json={"name": "ana"})
    assert duplicate.status_code == 400

    list_response = client.get("/api/players")
    assert list_response.status_code == 200
    names = [player["name"] for player in list_response.json()]
    assert "Ana" in names


def test_admin_question_validation_rejects_bad_payload():
    bad_payload = {
        "category": "Collections",
        "text": "Pregunta inválida",
        "options": ["A", "B"],
        "answer_index": 4,
    }

    response = client.post("/api/admin/questions", json=bad_payload)
    assert response.status_code == 422


def test_player_update_and_delete():
    create = client.post("/api/players", json={"name": "Player Update"})
    assert create.status_code == 200
    player_id = create.json()["id"]

    update = client.put(f"/api/players/{player_id}", json={"name": "Player Renamed"})
    assert update.status_code == 200
    assert update.json()["name"] == "Player Renamed"

    deleted = client.delete("/api/players/Player Renamed")
    assert deleted.status_code == 200
    assert client.delete("/api/players/Player Renamed").status_code == 404


def test_admin_question_crud_persists_changes():
    payload = {
        "category": "JSON y APIs",
        "text": "Pregunta temporal para probar persistencia",
        "options": ["A", "B", "C", "D"],
        "answer_index": 2,
    }

    created = client.post("/api/admin/questions", json=payload)
    assert created.status_code == 200
    question_id = created.json()["id"]
    assert any(q["id"] == question_id for q in client.get("/api/questions").json())

    updated_payload = {**payload, "text": "Pregunta persistida luego de editar"}
    updated = client.put(f"/api/admin/questions/{question_id}", json=updated_payload)
    assert updated.status_code == 200
    persisted = next(q for q in client.get("/api/questions").json() if q["id"] == question_id)
    assert persisted["text"] == updated_payload["text"]

    deleted = client.delete(f"/api/admin/questions/{question_id}")
    assert deleted.status_code == 200
    assert all(q["id"] != question_id for q in client.get("/api/questions").json())


def test_spin_answer_updates_score_and_statistics():
    player_name = "Game Test"
    assert client.post("/api/players", json={"name": player_name}).status_code == 200

    spun = client.post("/api/spin")
    assert spun.status_code == 200
    spin_payload = spun.json()
    assert spin_payload["category"]
    assert spin_payload["question"]

    question = spin_payload["question"]
    answer = client.post(
        "/api/answer",
        json={
            "player_name": player_name,
            "question_id": question["id"],
            "option_index": question["answer_index"],
            "tiempo_respuesta": 3,
            "tiempo_limite": 15,
        },
    )
    assert answer.status_code == 200

    player = next(p for p in client.get("/api/players").json() if p["name"] == player_name)
    assert player["score"] == 10
    assert player["correct"] == 1
    stats = client.get("/api/podium").json()["estadisticas"]
    assert stats["tiempos_respuesta"]["agil"] >= 1

    incorrect = client.post(
        "/api/answer",
        json={
            "player_name": player_name,
            "question_id": question["id"],
            "option_index": (question["answer_index"] + 1) % 4,
            "tiempo_respuesta": 8,
            "tiempo_limite": 15,
        },
    )
    assert incorrect.status_code == 200
    player_after_incorrect = next(
        p for p in client.get("/api/players").json() if p["name"] == player_name
    )
    assert player_after_incorrect["score"] == 10
    assert player_after_incorrect["wrong"] == 1
