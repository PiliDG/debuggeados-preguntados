from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator

from .game import Game
from .models import Player, Question
from .storage import read_db, write_db

FRONT_DIR = Path(__file__).resolve().parent.parent / "frontend"


class QuestionIn(BaseModel):
    category: str = Field(..., min_length=2, max_length=50)
    text: str = Field(..., min_length=10, max_length=250)
    options: List[str] = Field(..., min_length=4, max_length=4)
    answer_index: int = Field(..., ge=0, le=3)

    @field_validator("category", "text")
    @classmethod
    def normalize_text(cls, value: str) -> str:
        cleaned = " ".join(value.strip().split())
        if not cleaned:
            raise ValueError("El campo no puede quedar vacío")
        return cleaned

    @field_validator("options")
    @classmethod
    def validate_options(cls, options: List[str]) -> List[str]:
        cleaned = [" ".join(str(option).strip().split()) for option in options]
        if len(cleaned) != 4:
            raise ValueError("Se requieren exactamente 4 opciones")
        if any(not option for option in cleaned):
            raise ValueError("Cada opción debe contener texto válido")
        return cleaned


class PlayerIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=30)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        cleaned = " ".join(value.strip().split())
        if not cleaned:
            raise ValueError("Nombre inválido")
        return cleaned


class AnswerIn(BaseModel):
    player_name: str = Field(..., min_length=1, max_length=30)
    question_id: str = Field(..., min_length=1, max_length=20)
    option_index: int = Field(..., ge=0, le=3)
    tiempo_respuesta: Optional[float] = None
    tiempo_limite: float = Field(..., gt=0)


def create_app() -> FastAPI:
    app = FastAPI(title="Debuggeados - Preguntados", version="1.0.0")
    players: List[Player] = []
    game = Game(players)

    app.mount("/static", StaticFiles(directory=str(FRONT_DIR)), name="static")

    @app.get("/")
    def index_root():
        return FileResponse(str(FRONT_DIR / "index.html"))

    @app.get("/api/categories")
    def get_categories():
        db = read_db()
        return sorted(db["categories"].keys())

    @app.get("/api/questions")
    def get_questions(category: Optional[str] = Query(default=None)):
        db = read_db()
        if category:
            if category not in db["categories"]:
                raise HTTPException(404, "Categoría no encontrada")
            ids = db["categories"][category]["question_ids"]
            return [db["questions"][qid] for qid in ids]
        return list(db["questions"].values())

    @app.post("/api/spin")
    def spin():
        cat = game.spin_wheel()
        q = game.next_question()
        return {"category": cat, "question": q}

    @app.post("/api/answer")
    def registrar_respuesta(req: AnswerIn):
        if req.player_name not in {p.name for p in players}:
            raise HTTPException(404, "Jugador no encontrado")
        db = read_db()
        if req.question_id not in db["questions"]:
            raise HTTPException(404, "Pregunta no encontrada")

        player = next(player for player in players if player.name == req.player_name)
        result = game.answer(player, req.question_id, req.option_index)
        return {"ok": True, "player": req.player_name, **result}

    @app.get("/api/podium")
    def podium():
        jugadores = sorted(game.get_players(), key=lambda p: p.score, reverse=True)
        return {
            "jugadores": [{"nombre": p.name, "puntos": p.score} for p in jugadores],
            "estadisticas": game.get_stats(),
        }

    @app.get("/api/admin/questions")
    def admin_list():
        db = read_db()
        return list(db["questions"].values())

    @app.post("/api/admin/questions")
    def admin_create(q: QuestionIn):
        db = read_db()
        used_ids = [
            int(question_id[1:])
            for question_id in db["questions"]
            if question_id.startswith("Q") and question_id[1:].isdigit()
        ]
        new_id = f"Q{max(used_ids, default=0) + 1:04d}"
        obj = Question(id=new_id, category=q.category, text=q.text, options=q.options, answer_index=q.answer_index)
        db["questions"][new_id] = obj.to_dict()
        db["categories"].setdefault(q.category, {"name": q.category, "question_ids": []})
        if new_id not in db["categories"][q.category]["question_ids"]:
            db["categories"][q.category]["question_ids"].append(new_id)
        write_db(db)
        return obj.to_dict()

    @app.put("/api/admin/questions/{qid}")
    def admin_update(qid: str, q: QuestionIn):
        db = read_db()
        if qid not in db["questions"]:
            raise HTTPException(404, "Pregunta no encontrada")

        obj = Question(id=qid, category=q.category, text=q.text, options=q.options, answer_index=q.answer_index)
        old_cat = db["questions"][qid]["category"]
        if old_cat != q.category:
            if qid in db["categories"].get(old_cat, {}).get("question_ids", []):
                db["categories"][old_cat]["question_ids"].remove(qid)
            db["categories"].setdefault(q.category, {"name": q.category, "question_ids": []})
            if qid not in db["categories"][q.category]["question_ids"]:
                db["categories"][q.category]["question_ids"].append(qid)

        db["questions"][qid] = obj.to_dict()
        write_db(db)
        return obj.to_dict()

    @app.delete("/api/admin/questions/{qid}")
    def admin_delete(qid: str):
        db = read_db()
        if qid not in db["questions"]:
            raise HTTPException(404, "Pregunta no encontrada")

        cat = db["questions"][qid]["category"]
        if qid in db["categories"].get(cat, {}).get("question_ids", []):
            db["categories"][cat]["question_ids"].remove(qid)

        del db["questions"][qid]
        write_db(db)
        return {"deleted": qid}

    @app.get("/api/ping")
    def ping():
        return {"ok": True, "status": "healthy"}

    def serialize_player(p: Player) -> dict:
        return {"id": p.name, "name": p.name, "score": p.score, "correct": p.correct, "wrong": p.wrong}

    def find_player_index(pid: str) -> int:
        for index, player in enumerate(players):
            if player.name == pid:
                return index
        return -1

    @app.get("/api/players")
    def list_players():
        return [serialize_player(player) for player in players]

    @app.post("/api/players")
    def create_player(data: PlayerIn):
        name = data.name.strip()
        if len(players) >= 20:
            raise HTTPException(400, "Máximo 20 jugadores")
        if any(player.name.lower() == name.lower() for player in players):
            raise HTTPException(400, "El jugador ya existe")

        new_player = Player(name)
        players.append(new_player)
        return serialize_player(new_player)

    @app.put("/api/players/{pid}")
    def update_player(pid: str, data: PlayerIn):
        index = find_player_index(pid)
        if index < 0:
            raise HTTPException(404, "Jugador no encontrado")

        new_name = data.name.strip()
        if any(player.name.lower() == new_name.lower() and player.name != pid for player in players):
            raise HTTPException(400, "El jugador ya existe")

        players[index].name = new_name
        return serialize_player(players[index])

    @app.delete("/api/players/{pid}")
    def delete_player(pid: str):
        index = find_player_index(pid)
        if index < 0:
            raise HTTPException(404, "Jugador no encontrado")
        players.pop(index)
        return {"deleted": pid}

    return app


app = create_app()
