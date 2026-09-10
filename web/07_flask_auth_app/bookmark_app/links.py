"""links 蓝图：书签列表与添加——蓝图级 before_request 做登录保护"""

from flask import (Blueprint, flash, g, redirect, render_template,
                   request, url_for)
from sqlalchemy import select

from bookmark_app.db import Link, get_db

bp = Blueprint("links", __name__, url_prefix="/links")


@bp.before_request
def require_login():
    """蓝图级守卫：本蓝图所有视图都要求登录，未登录一律 302 去登录页"""
    if g.user is None:
        flash("请先登录", "error")
        return redirect(url_for("auth.login"))


@bp.route("/")
def index():
    links_list = get_db().scalars(
        select(Link).where(Link.user_id == g.user.id)).all()
    return render_template("links/index.html", links_list=links_list)


@bp.route("/add", methods=["POST"])
def add():
    url = request.form.get("url", "").strip()
    if url:
        db = get_db()
        db.add(Link(url=url, title=request.form.get("title", "") or url,
                    user_id=g.user.id))
        db.commit()
        flash("书签已添加", "ok")
    return redirect(url_for("links.index"))
