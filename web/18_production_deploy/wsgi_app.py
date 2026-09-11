"""生产姿态的最小 WSGI 应用：12-factor 环境变量配置 + worker PID 暴露

配置全部来自环境变量（APP_MODE），进程 import 时读取——gunicorn master 的环境
会被每个 worker 继承，这正是 12-factor"配置注入环境"的机制。
"""

import os

from flask import Flask, jsonify

app = Flask(__name__)
MODE = os.environ.get("APP_MODE", "unset")


@app.get("/healthz")
def healthz():
    return {"status": "ok", "mode": MODE}


@app.get("/pid")
def pid():
    return {"pid": os.getpid(), "mode": MODE}


@app.after_request
def tag_mode(response):
    response.headers["X-App-Mode"] = MODE
    return response
