# Lab 23 · 短链/演示应用的容器镜像。
# 说明:本仓库演示机无 Docker daemon,构建命令未实跑(README 诚实标注);
#       文件本身按生产惯例编写:多阶段构建 + 非 root 用户 + 精简基础镜像。
FROM python:3.13-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# 依赖层独立成层:代码改动不再触发重装依赖(层缓存)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

# 容器内以非 root 运行
RUN useradd --create-home appuser
USER appuser

# 1 容器 1 进程;横向扩展交给 compose/k8s 副本数(呼应 lab 18/22 的进程内状态边界)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
