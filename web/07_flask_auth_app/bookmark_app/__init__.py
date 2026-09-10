"""书签应用包：create_app 应用工厂是本实验的教学核心

create_app(test_config) 每调用一次就产出一个**完全独立**的应用实例：
独立的配置、独立的数据库 engine、各自注册蓝图——这就是"工厂模式"：
测试用内存库、开发用本地库、生产用远端库，代码一行不改。
"""

import os

from flask import Flask


def create_app(test_config: dict | None = None) -> Flask:
    app = Flask(__name__)
    app.config.from_mapping(
        SECRET_KEY="demo-secret-key",  # 生产从环境变量注入（项目 5 的教训）
        DATABASE=os.path.join(os.path.dirname(__file__), "..", "bookmarks.db"),
    )
    if test_config:
        app.config.update(test_config)

    from bookmark_app import auth, db, links
    db.init_app(app)
    app.register_blueprint(auth.bp)   # /auth/*  注册与登录
    app.register_blueprint(links.bp)  # /links/* 书签管理（登录保护）
    app.teardown_appcontext(db.close_db)  # 每个请求结束顺手关 session（项目 6 的"一请求一 session"）
    return app
