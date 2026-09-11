"""同题 TODO API · Flask 实现（WSGI 微框架方言：request 全局 + 手工状态码）"""

import threading

from flask import Flask, jsonify, request

from tokenbox import make_token, verify_token

app = Flask(__name__)
TODOS: dict[int, dict] = {}
NEXT_ID = 1
LOCK = threading.Lock()
USERS = {"alice": "wonderland"}


@app.post("/token")
def token():
    body = request.get_json(silent=True) or {}
    if USERS.get(body.get("username")) != body.get("password"):
        return jsonify({"error": "bad credentials"}), 401
    return jsonify({"token": make_token(body["username"])})


@app.get("/todos")
def list_todos():
    return jsonify(sorted(TODOS.values(), key=lambda t: t["id"]))


@app.post("/todos")
def create_todo():
    global NEXT_ID
    body = request.get_json(silent=True) or {}
    title = body.get("title", "").strip()
    if not title:
        return jsonify({"error": "title required"}), 400
    with LOCK:
        todo = {"id": NEXT_ID, "title": title, "done": False}
        TODOS[NEXT_ID] = todo
        NEXT_ID += 1
    return jsonify(todo), 201


@app.get("/todos/<int:todo_id>")
def get_todo(todo_id: int):
    todo = TODOS.get(todo_id)
    return (jsonify(todo), 200) if todo else (jsonify({"error": "not found"}), 404)


@app.delete("/todos/<int:todo_id>")
def delete_todo(todo_id: int):
    if TODOS.pop(todo_id, None) is None:
        return jsonify({"error": "not found"}), 404
    return "", 204


@app.get("/secret")
def secret():
    auth = request.headers.get("Authorization", "")
    user = verify_token(auth.removeprefix("Bearer ")) if auth.startswith("Bearer ") else None
    if user is None:
        return jsonify({"error": "unauthorized"}), 401
    return jsonify({"secret": f"{user} 的私密数据"})
