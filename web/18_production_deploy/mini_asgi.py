from fastapi import FastAPI

app = FastAPI(title="容器化健康检查演示")


@app.get("/healthz")
def healthz():
    return {"status": "ok", "container": True}
