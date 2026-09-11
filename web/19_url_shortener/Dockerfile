# 短链接服务镜像：分层缓存 + 生产 ASGI 入口
FROM python:3.13-slim

WORKDIR /srv

RUN pip install --no-cache-dir fastapi uvicorn sqlalchemy pyjwt bcrypt

COPY shortener_app.py .

ENV SHORTENER_DB=/srv/data/shortener.db
RUN mkdir -p /srv/data  # sqlite 需要目录存在，否则启动即崩

EXPOSE 8000

CMD ["uvicorn", "shortener_app:app", "--host", "0.0.0.0", "--port", "8000"]
