"""同题 TODO API · FastAPI 实现（ASGI 类型驱动方言：Pydantic + 依赖注入）"""

import asyncio
import typing

import uvicorn
from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel

from tokenbox import make_token, verify_token

app = FastAPI(title="TODO · FastAPI")
TODOS: dict[int, dict] = {}
NEXT_ID = 1
LOCK = asyncio.Lock()
USERS = {"alice": "wonderland"}


def require_user(authorization: typing.Annotated[str, Header()] = ""):
    token = authorization.removeprefix("Bearer ").strip()
    user = verify_token(token) if token else None
    if user is None:
        raise HTTPException(status_code=401, detail="unauthorized")
    return user


class TodoCreate(BaseModel):
    title: str
    done: bool = False


class TokenBody(BaseModel):
    username: str
    password: str


@app.post("/token")
def issue_token(body: TokenBody):
    if USERS.get(body.username) != body.password:
        raise HTTPException(status_code=401, detail="bad credentials")
    return {"token": make_token(body.username)}


@app.get("/todos")
async def list_todos():
    return sorted(TODOS.values(), key=lambda t: t["id"])


@app.post("/todos", status_code=201)
async def create_todo(todo: TodoCreate):
    global NEXT_ID
    title = todo.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="title required")
    async with LOCK:
        record = {"id": NEXT_ID, "title": title, "done": todo.done}
        TODOS[NEXT_ID] = record
        NEXT_ID += 1
    return record


@app.get("/todos/{todo_id}")
async def get_todo(todo_id: int):
    todo = TODOS.get(todo_id)
    if todo is None:
        raise HTTPException(status_code=404, detail="not found")
    return todo


@app.delete("/todos/{todo_id}", status_code=204)
async def delete_todo(todo_id: int):
    if TODOS.pop(todo_id, None) is None:
        raise HTTPException(status_code=404, detail="not found")


@app.get("/secret")
async def secret(user: str = Depends(require_user)):
    return {"secret": f"{user} 的私密数据"}


# 供 showdown.py 用 uvicorn 拉起
if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
