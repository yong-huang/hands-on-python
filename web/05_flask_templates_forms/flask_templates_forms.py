"""
05 · 模板与表单 —— Jinja2 渲染、WTForms 校验与 CSRF 防线
Web 框架清单项目 5：服务端渲染时代的两道输入防线，全部实测

这一课的三条主线（对应 images/flask_templates_forms.svg）:
- 模板:  base.html 继承 + _macros.html 宏渲染字段 + dtime 自定义过滤器 +
         自动转义——`<script>` 出门就变 `&lt;script&gt;`，XSS 的一道墙
- 校验:  WTForms 字段级 validators（必填/长度），错误文案随表单 200 回显
- CSRF:  CSRFProtect 全局防线——POST 必须带 GET 表单页签发的 csrf_token，
         缺失/错误直接 400；合法 token 才放行进校验与落库

验收断言（全部 test_client 实测）:
- 缺字段/超长提交 → 200 且错误文案出现在响应里；合法提交 → 302 落库 + flash 回显
- `<script>alert(1)</script>` 存进去，渲染出来是转义后的文本（XSS 防护）
- 无 token POST → 400；带 token → 302

用法:
- source ../.venv/bin/activate && python3 flask_templates_forms.py

交互示意图: 用浏览器打开 images/flask_templates_forms.html
"""

import re
import sys
from datetime import datetime

from flask import Flask, flash, redirect, render_template, url_for
from flask_wtf import CSRFProtect, FlaskForm
from wtforms import StringField, SubmitField, TextAreaField
from wtforms.validators import DataRequired, Length

app = Flask(__name__)
app.config["SECRET_KEY"] = "demo-secret-for-csrf-and-flash"  # 生产从环境变量注入
csrf = CSRFProtect(app)  # 全局 CSRF 防线：所有 POST 都要带 token

MESSAGES: list[dict] = []  # 内存存储：本实验只关心"写进去了"，不关心持久化


class MessageForm(FlaskForm):
    name = StringField("昵称", validators=[
        DataRequired(message="昵称必填"),
        Length(max=10, message="昵称最长 10 字"),
    ])
    content = TextAreaField("留言", validators=[
        DataRequired(message="留言必填"),
        Length(max=50, message="留言最长 50 字"),
    ])
    submit = SubmitField("提交留言")


@app.template_filter("dtime")
def dtime(dt: datetime) -> str:
    """自定义过滤器：模板里 {{ msg.created|dtime }} 调用"""
    return dt.strftime("%H:%M:%S")


@app.route("/", methods=["GET", "POST"])
def index():
    form = MessageForm()
    if form.validate_on_submit():  # 内含 CSRF + 字段校验两道闸
        MESSAGES.append({
            "name": form.name.data.strip(),
            "content": form.content.data,
            "created": datetime.now(),
        })
        flash("留言成功！", "ok")
        return redirect(url_for("index"))  # PRG 模式：刷新不重复提交
    return render_template("messages.html", form=form, messages=MESSAGES)


def section(title: str) -> None:
    print(f"\n{'=' * 56}\n[{title}]\n{'=' * 56}")


# ============================================================
# 测试助手：取 token / 提交留言
# ============================================================

def fetch_token(client) -> str:
    """从 GET 渲染的表单页里抠出 csrf_token——浏览器用户不需要这步，表单自动带上"""
    html = client.get("/").get_data(as_text=True)
    m = re.search(r'name="csrf_token"[^>]*value="([^"]+)"', html)
    assert m, "表单应渲染出 csrf_token 隐藏域（hidden_tag 的产物）"
    return m.group(1)


def post_message(client, token, name="alice", content="Flask 真香"):
    return client.post("/", data={
        "csrf_token": token, "name": name, "content": content,
    })


# ============================================================
# 1. 模板渲染观察：继承 / 宏 / 过滤器 / hidden_tag
# ============================================================

def demo_render(client) -> None:
    section("1. 模板渲染观察：继承 + 宏 + 过滤器 + csrf_token 埋点")
    html = client.get("/").get_data(as_text=True)
    assert "留言板实验室" in html, "base.html 的 header 块应被渲染"
    assert "昵称" in html and "留言" in html, "宏 render_field 应渲染出 label"
    assert 'name="csrf_token"' in html, "hidden_tag 应埋进 csrf_token"
    assert "共 0 条留言" in html, "length 过滤器应生效"
    print(f"  页面标题/头部来自 base.html 的 block（继承生效）")
    print(f"  表单字段由宏 render_field 统一渲染，错误文案位预留")
    print(f"  hidden_tag 埋进 csrf_token（{len(fetch_token(client))} 字符）· footer: 共 0 条留言（length 过滤器）")


# ============================================================
# 2. CSRF 防线：无 token 的 POST 直接 400
# ============================================================

def demo_csrf(client) -> None:
    section("2. CSRF 防线：无 token 的 POST 走不到视图（验收点）")
    r = client.post("/", data={"name": "mallory", "content": "skip csrf"})
    assert r.status_code == 400, f"无 token 应 400，实际 {r.status_code}"
    print(f"  不带 csrf_token 的 POST → {r.status_code}（CSRFProtect 在视图之前拦截）")
    print("  原理：token 由服务器签发并埋进表单，恶意站点诱导的跨站 POST 拿不到它")
    r = client.post("/", data={"csrf_token": "forged-value", "name": "mallory", "content": "x"})
    assert r.status_code == 400, f"伪造 token 应 400，实际 {r.status_code}"
    print(f"  伪造 token 的 POST      → {r.status_code}（签名校验不过）")


# ============================================================
# 3. WTForms 校验：缺字段与超长的错误回显
# ============================================================

def demo_validation(client, token) -> None:
    section("3. WTForms 校验：缺字段 / 超长 → 200 + 错误文案")
    r = post_message(client, token, name="", content="")
    html = r.get_data(as_text=True)
    assert r.status_code == 200, f"校验失败应 200 回显表单，实际 {r.status_code}"
    assert "昵称必填" in html and "留言必填" in html, "错误文案应出现在渲染结果里"
    print(f"  全空提交 → {r.status_code}，页面含「昵称必填」「留言必填」")

    r = post_message(client, token, name="x" * 11, content="短留言")
    html = r.get_data(as_text=True)
    assert "昵称最长 10 字" in html, "超长错误文案应回显"
    assert "共 0 条留言" in html, "非法数据不应落库"
    print(f"  11 字昵称 → {r.status_code}，页面含「昵称最长 10 字」且不落库（仍 0 条）")


# ============================================================
# 4. 合法提交：302 落库 + flash 回显（PRG 模式）
# ============================================================

def demo_legal_submit(client, token) -> None:
    section("4. 合法提交：302 落库 + flash 消息（验收点）")
    r = post_message(client, token, name="alice", content="Flask 真香")
    assert r.status_code == 302, f"合法提交应 302 重定向，实际 {r.status_code}"
    assert len(MESSAGES) == 1 and MESSAGES[0]["name"] == "alice", "数据应写入存储"
    print(f"  带 token 合法提交 → {r.status_code} 重定向，存储落库 {len(MESSAGES)} 条")

    r = client.get("/")  # 重定向后的页面
    html = r.get_data(as_text=True)
    assert "留言成功！" in html, "flash 消息应出现在重定向后的页面"
    assert "alice" in html and "Flask 真香" in html, "留言内容应渲染出来"
    assert "共 1 条留言" in html, "length 过滤器应更新"
    print(f"  重定向后页面：flash「留言成功！」+ 留言渲染 + 共 1 条留言（dtime 过滤器显示时间）")


# ============================================================
# 5. 自动转义：XSS 输入存得进去，渲染出来是安全文本
# ============================================================

def demo_autoescape(client, token) -> None:
    section("5. 自动转义：`<script>` 出门就变 `&lt;script&gt;`（验收点）")
    evil = '<script>alert(1)</script>你好'
    r = post_message(client, token, name="eve", content=evil)
    assert r.status_code == 302, "含 script 的字符串也能合法提交——存储层不做过滤"
    html = client.get("/").get_data(as_text=True)
    assert "&lt;script&gt;alert(1)&lt;/script&gt;" in html, "script 应被转义后渲染"
    assert "<script>alert(1)" not in html, "绝不能出现可执行的原样 script"
    print(f"  提交内容: {evil!r} → 落库成功（存储层不过滤）")
    print(f"  渲染结果: &lt;script&gt;alert(1)&lt;/script&gt;你好（Jinja2 自动转义）")
    print("  防线分层：入库不拦、出口转义；想原样输出必须显式 |safe——一线之隔就是 XSS")


def main() -> None:
    from importlib.metadata import version as _v
    if tuple(int(x) for x in _v("flask").split(".")[:2]) < (3, 0):
        sys.exit(f"本实验需要 flask ≥ 3.0（当前 {_v('flask')}）。"
                 f"请先激活系列环境：source ../.venv/bin/activate")
    from importlib.metadata import version
    print(f"Python {sys.version.split()[0]} · Flask {version('flask')} + WTForms "
          f"{version('wtforms')} · 模板与表单实验")
    client = app.test_client()
    token = fetch_token(client)
    demo_render(client)
    demo_csrf(client)
    demo_validation(client, token)
    demo_legal_submit(client, token)
    demo_autoescape(client, token)

    print(f"\n{'=' * 56}")
    print("全部断言通过 ✓ 无 token 400 / 缺字段超长 200 回显 / 合法 302 落库 + flash / XSS 转义")


if __name__ == "__main__":
    main()
