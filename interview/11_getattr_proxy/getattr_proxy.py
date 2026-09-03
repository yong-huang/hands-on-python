"""
__getattr__ / __getattribute__ —— 属性访问控制与动态代理
面试高频题: __getattr__ vs __getattribute__、动态属性、懒加载、API 代理

Python 属性查找链: __getattribute__ -> 数据描述符 -> 实例 __dict__ ->
非数据描述符 -> __getattr__(仅在找不到时调用)

核心概念:
- __getattribute__: 每次属性访问都触发（包括已存在的属性）
- __getattr__: 仅在常规查找失败后触发（属性不存在时）
- 动态属性: 根据访问模式生成/计算属性
- 代理模式: 将属性访问转发到内部对象

交互示意图: 用浏览器打开 images/getattr_proxy.archify.html
"""

import time


# ============================================================
# 1. __getattr__ — 属性不存在时触发
# ============================================================

class DynamicAttributes:
    """动态属性: 访问不存在的属性时自动计算"""
    def __init__(self, data):
        self._data = data

    def __getattr__(self, name):
        """仅在常规查找失败时调用"""
        if name in self._data:
            return self._data[name]
        raise AttributeError(f"'{type(self).__name__}' has no attribute '{name}'")

    def __repr__(self):
        return f"DynamicAttributes({list(self._data.keys())})"


# ============================================================
# 2. __getattribute__ — 每次访问都触发
# ============================================================

class AccessLogger:
    """属性访问日志: 记录所有读写"""
    def __init__(self):
        self._data = {}
        self._log = []

    def __getattribute__(self, name):
        """每次属性访问都触发（包括已存在的）"""
        # 注意: 不要在 __getattribute__ 中用 self.xxx，会无限递归！
        log = object.__getattribute__(self, '_log')
        data = object.__getattribute__(self, '_data')
        if name.startswith('_'):
            return object.__getattribute__(self, name)
        log.append(("get", name))
        if name in data:
            return data[name]
        # 不在 _data 中的公开属性(如方法): 走基类查找取回(绕过本重写, 避免递归)
        method = object.__getattribute__(self, name)
        return method

    def __setattr__(self, name, value):
        """每次属性设置都触发"""
        if name.startswith('_'):
            object.__setattr__(self, name, value)
        else:
            self._data[name] = value
            self._log.append(("set", name))

    def get_log(self):
        return list(self._log)


# ============================================================
# 3. 代理模式 — 转发到内部对象
# ============================================================

class Proxy:
    """通用代理: 将属性访问转发到被代理对象"""
    def __init__(self, obj):
        object.__setattr__(self, '_obj', obj)

    def __getattr__(self, name):
        return getattr(self._obj, name)

    def __setattr__(self, name, value):
        if name == '_obj':
            object.__setattr__(self, name, value)
        else:
            setattr(self._obj, name, value)

    def __repr__(self):
        return f"Proxy({self._obj!r})"

    def __dir__(self):
        return dir(self._obj)


# ============================================================
# 4. 懒加载属性
# ============================================================

class LazyConfig:
    """配置对象: 首次访问时加载"""
    def __init__(self):
        self._loaded = False
        self._cache = {}

    def load(self):
        """模拟耗时加载"""
        time.sleep(0.001)
        self._cache = {
            "host": "localhost",
            "port": 8080,
            "debug": True,
        }
        self._loaded = True

    def __getattr__(self, name):
        if not object.__getattribute__(self, '_loaded'):
            self.load()
        cache = object.__getattribute__(self, '_cache')
        if name in cache:
            return cache[name]
        raise AttributeError(f"'{name}' not in config")

    def __repr__(self):
        return f"LazyConfig(loaded={self._loaded})"


# ============================================================
# 5. Demo
# ============================================================

def run_demo():
    print("=" * 60)
    print("__getattr__ / __getattribute__ -- Demo Mode")
    print("=" * 60)

    # 1) __getattr__
    print("\n[1] __getattr__ (only on missing):")
    obj = DynamicAttributes({"name": "Alice", "age": 30})
    print(f"  obj.name = {obj.name}")
    print(f"  obj.age = {obj.age}")
    try:
        _ = obj.email
    except AttributeError as e:
        print(f"  obj.email -> AttributeError: {e}")

    # 2) __getattribute__
    print("\n[2] __getattribute__ (every access):")
    logger = AccessLogger()
    logger.x = 10
    logger.y = 20
    _ = logger.x
    _ = logger.y
    try:
        _ = logger.z
    except AttributeError:
        # 失败的访问同样被 __getattribute__ 记录为 ('get', 'z')
        print("  logger.z -> AttributeError (logged as ('get', 'z'))")
    print(f"  Access log: {logger.get_log()}")

    # 3) Proxy
    print("\n[3] Proxy (attribute forwarding):")
    class Service:
        def __init__(self):
            self.host = "api.example.com"
            self.timeout = 30
        def connect(self):
            return f"Connected to {self.host}:{self.timeout}"

    svc = Service()
    p = Proxy(svc)
    print(f"  p.host = {p.host}")
    print(f"  p.connect() = {p.connect()}")
    p.timeout = 60
    print(f"  After proxy setattr: p.timeout = {p.timeout}, svc.timeout = {svc.timeout}")

    # 4) Lazy loading
    print("\n[4] Lazy loading (__getattr__ triggers load):")
    cfg = LazyConfig()
    print(f"  Before access: {cfg}")
    print(f"  cfg.host = {cfg.host}")
    print(f"  After access: {cfg}")

    # 5) Difference
    print("\n[5] Key difference:")
    print("  __getattribute__: ALWAYS called (every attr access)")
    print("  __getattr__:      ONLY called when normal lookup FAILS")
    print("  Rule: use __getattr__ for dynamic/missing attrs")
    print("        use __getattribute__ for logging/validation on ALL attrs")
    print("  WARNING: never use self.xxx inside __getattribute__!")
    print("           Use object.__getattribute__(self, 'xxx') instead")

    print(f"\n{'='*60}")


if __name__ == "__main__":
    # 只跑 demo; 交互示意图见 images/getattr_proxy.archify.html
    run_demo()
