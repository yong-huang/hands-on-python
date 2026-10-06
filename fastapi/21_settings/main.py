"""Lab 21 · 告警阈值 API —— 配置生效现场的观察窗口。"""

from functools import lru_cache

from fastapi import Depends, FastAPI

from settings import Settings, get_settings

app = FastAPI(title="Lab 21 · 配置管理")


@app.get("/healthz")
def healthz() -> dict:
    return {"ok": True}


@app.get("/config")
def show_config(settings: Settings = Depends(get_settings)) -> dict:
    """回显当前生效配置与来源标记。

    来源标记规则(演示口径):debug=true 通常只出现在 dev 文件里,
    threshold 与 max_retries 的具体值由本次启动的优先级链决定。
    """
    return {
        "app_name": settings.app_name,
        "debug": settings.debug,
        "threshold": settings.threshold,
        "max_retries": settings.max_retries,
        "secret": "***已注入***" if settings.secret_set_by_env else "未注入",
    }


@app.get("/cache-proof")
def cache_proof(settings_a: Settings = Depends(get_settings),
                settings_b: Settings = Depends(get_settings)) -> dict:
    """同一请求里两次依赖 get_settings——lru_cache 使两者是同一对象。"""
    return {"same_object": settings_a is settings_b}
