# 生产容器：官方 slim 基础镜像 + 生产级 ASGI 服务器（不用 dev server 进容器）
FROM python:3.13-slim

WORKDIR /srv

# 先装依赖再拷代码——依赖层缓存住，代码改动不触发重装
RUN pip install --no-cache-dir fastapi uvicorn

COPY mini_asgi.py .

EXPOSE 8000

CMD ["uvicorn", "mini_asgi:app", "--host", "0.0.0.0", "--port", "8000"]
