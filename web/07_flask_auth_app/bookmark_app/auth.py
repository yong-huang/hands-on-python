"""auth 蓝图：注册 / 登录 / 登出 + 全局用户加载"""

from flask import (Blueprint, flash, g, redirect, render_template,
                   request, session, url_for)
from sqlalchemy import select

from bookmark_app.db import (MAX_ATTEMPTS, User, get_db, hash_password,
                             verify_password)

bp = Blueprint("auth", __name__, url_prefix="/auth")


@bp.before_app_request
def load_logged_in_user():
    """app 级钩子：每个请求（无论哪个蓝图）开始时，把 session 里的登录态装进 g.user"""
    user_id = session.get("user_id")
    g.user = get_db().get(User, user_id) if user_id is not None else None


@bp.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        password = request.form.get("password", "")
        db = get_db()
        error = None
        if not name or not password:
            error = "用户名与密码都不能为空"
        elif len(password) < 6:
            error = "密码至少 6 位"
        elif db.scalars(select(User).where(User.name == name)).first():
            error = "用户名已被占用"
        if error is None:
            db.add(User(name=name, password_hash=hash_password(password)))
            db.commit()
            flash("注册成功，请登录", "ok")
            return redirect(url_for("auth.login"))
        flash(error, "error")
    return render_template("auth/register.html")


@bp.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        password = request.form.get("password", "")
        db = get_db()
        user = db.scalars(select(User).where(User.name == name)).first()

        if user is None:  # 与"密码错误"同响应：不向探测者泄露用户是否存在
            return render_template("auth/login.html"), 401
        if user.failed_attempts >= MAX_ATTEMPTS:  # 锁定先于密码校验——爆破没有第二次机会
            return render_template("auth/login.html"), 429
        if not verify_password(user, password):
            user.failed_attempts += 1
            db.commit()
            remaining = MAX_ATTEMPTS - user.failed_attempts
            flash(f"密码错误（再错 {remaining} 次将锁定）", "error")
            return render_template("auth/login.html"), 401

        user.failed_attempts = 0  # 登录成功清零计数
        db.commit()
        session.clear()  # 先清再写：防 session fixation
        session["user_id"] = user.id
        flash("登录成功", "ok")
        return redirect(url_for("links.index"))
    return render_template("auth/login.html")


@bp.route("/logout")
def logout():
    session.clear()
    flash("已登出", "ok")
    return redirect(url_for("auth.login"))
