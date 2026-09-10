# 11 · `__getattr__` 与 `__getattribute__`：属性访问控制与动态代理

> 上一篇的 ABC / Protocol 归根结底都在回答同一个问题："这个对象有没有某属性？"
> 那么属性到底是怎么被找到的？`obj.name` 一行代码背后是一条五级查找链，
> 链上有两个钩子：`__getattr__` 兜底、`__getattribute__` 全程拦截。
> 分不清两者的触发时机，动态属性、代理、懒加载这些模式就无从下手。

## 1. 为什么需要它

Python 的属性访问背后有一条完整的查找链：`__getattribute__` -> 数据描述符 -> 实例 `__dict__` -> 非数据描述符 -> `__getattr__`。`__getattribute__` 在**每次**属性访问时都触发，而 `__getattr__` 仅在常规查找**失败后**才触发。不理解这条链，写出 `__getattribute__` 里用 `self._log` 的代码会直接 `RecursionError`，代理对象会把自身属性和被代理属性搅在一起。理解两者的区别和触发时机，是实现动态属性、懒加载、代理模式等高级模式的基础，也是 Python 面试中的高频考点。

## 2. 总览：核心机制一图看懂

![__getattr__ 动态代理：未声明的属性去哪找](images/getattr_proxy.svg)

一句话心智模型：**`__getattribute__` 是大门（每次都过），`__getattr__` 是兜底（找不到才来）**。看图时顺着 `proxy.config` 走：实例/类里都没有 → 触发 `__getattr__` → 转发给真实对象 `getattr(self._target)` → 懒加载首次访问才 `load()`；目标对象也没有 → `AttributeError`。这条"失败才转发"的路径正是代理和懒加载都选 `__getattr__` 做钩子的原因。

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/interview/11_getattr_proxy/images/getattr_proxy.html)
> （或本地打开 [`images/getattr_proxy.html`](images/getattr_proxy.html)）。

## 3. 快速开始

```bash
cd interview/11_getattr_proxy
python3 getattr_proxy.py          # 运行 demo
```

真实输出示例（macOS, CPython 3.10）：

```
[1] __getattr__ (only on missing):
  obj.name = Alice
  obj.age = 30
  obj.email -> AttributeError: 'DynamicAttributes' has no attribute 'email'

[2] __getattribute__ (every access):
  logger.z -> AttributeError (logged as ('get', 'z'))
  Access log: [('set', 'x'), ('set', 'y'), ('get', 'x'), ('get', 'y'), ('get', 'z'), ('get', 'get_log')]

[3] Proxy (attribute forwarding):
  p.host = api.example.com
  p.connect() = Connected to api.example.com:30
  After proxy setattr: p.timeout = 60, svc.timeout = 60

[4] Lazy loading (__getattr__ triggers load):
  Before access: LazyConfig(loaded=False)
  cfg.host = localhost
  After access: LazyConfig(loaded=True)
```

诚实预期（本机实测）：

- demo 输出是**确定性的**（不涉及计时/并发），每次运行结果一致
- `[2]` 的 Access log 里会出现 `('get', 'get_log')` —— 因为 `logger.get_log()` 本身也是属性访问，被 `__getattribute__` 记录了下来，这正是"每次访问都触发"的证据，不是 bug
- 本 demo 不演示无限递归的实际崩溃（`RecursionError`），只以文字警告形式提示；想验证可自行在 `__getattribute__` 里写 `self._log` 触发

## 4. 核心概念

### 4.1 `__getattr__` — 属性不存在时触发

```python
class DynamicAttributes:
    def __init__(self, data):
        self._data = data

    def __getattr__(self, name):
        """仅在常规查找失败时调用"""
        if name in self._data:
            return self._data[name]
        raise AttributeError(f"'{type(self).__name__}' has no attribute '{name}'")
```

- `obj.name` 先走常规查找（`__getattribute__` -> `obj.__dict__`），找不到才调 `__getattr__`
- 适合场景：**动态属性**、**默认值**、**向后兼容的重命名属性**

### 4.2 `__getattribute__` — 每次访问都触发

```python
class AccessLogger:
    def __getattribute__(self, name):
        log = object.__getattribute__(self, '_log')   # 必须用 object.__getattribute__
        if name.startswith('_'):
            return object.__getattribute__(self, name)
        log.append(("get", name))
        # ...
```

- **每个**属性访问都会进入 `__getattribute__`，包括已存在的属性
- 必须用 `object.__getattribute__(self, name)` 访问自身属性，否则**无限递归**
- 适合场景：**访问日志**、**权限校验**、**不可变对象**

### 4.3 代理模式（Proxy）

```python
class Proxy:
    def __init__(self, obj):
        object.__setattr__(self, '_obj', obj)  # 避免触发自定义 __setattr__

    def __getattr__(self, name):
        return getattr(self._obj, name)         # 转发到被代理对象

    def __setattr__(self, name, value):
        if name == '_obj':
            object.__setattr__(self, name, value)
        else:
            setattr(self._obj, name, value)
```

- 代理模式的核心：`__getattr__` 将属性访问**透明转发**到内部对象
- 客户端代码只和 Proxy 交互，完全不知道真实对象的存在
- 典型用途：**API wrapper**、**远程调用**、**懒初始化**、**访问控制**

### 4.4 懒加载

```python
class LazyConfig:
    def __getattr__(self, name):
        if not object.__getattribute__(self, '_loaded'):
            self.load()                           # 首次访问时才加载
        cache = object.__getattribute__(self, '_cache')
        if name in cache:
            return cache[name]
        raise AttributeError(f"'{name}' not in config")
```

- 配置/资源在首次访问时才加载，避免启动时的开销
- `__getattr__` 是实现懒加载最自然的方式：属性不存在 -> 触发加载 -> 返回值

## 5. 关键代码解析

最核心的构造是 Proxy 的"写走 `__setattr__` 分流、读走 `__getattr__` 兜底"组合：

```python
def __init__(self, obj):
    object.__setattr__(self, '_obj', obj)   # 为什么：绕过下面的自定义 __setattr__，
                                            # 否则初始化 _obj 就会被转发给还没绑定的对象

def __getattr__(self, name):
    return getattr(self._obj, name)         # 为什么安全：_obj 是真实存在的属性，
                                            # 走常规查找命中，不会进这里——只有
                                            # "代理身上没有的属性"才被转发出去
```

坑清单：

- **`__getattribute__` 里写 `self.xxx` 必无限递归**：`self.xxx` 本身就是属性访问，会再次调用 `__getattribute__`，最终 `RecursionError`；必须用 `object.__getattribute__(self, 'xxx')` 绕过自定义逻辑。`__setattr__` 同理要用 `object.__setattr__`
- **`('get', 'get_log')` 出现在访问日志里不是 bug**：方法调用 `logger.get_log()` 的第一步"取方法"也是属性访问，被 `__getattribute__` 记录——这正是"每次访问都触发"的证据
- **懒加载/代理读自身状态要用 `object.__getattribute__`**：`LazyConfig.__getattr__` 里查 `_loaded`/`_cache` 都绕开常规链，避免误触发自身
- **本 demo 不实际演示 `RecursionError` 崩溃**，只以文字警告提示；想验证可自行在 `__getattribute__` 里写 `self._log` 触发
- **示意图中的转发路径是示意数据**（展示"失败才转发"的模式），不是某次运行的实录

## 6. 文件结构

```
11_getattr_proxy/
├── README.md                        # 本教程文档
├── getattr_proxy.py                 # 主演示脚本：动态属性 / 访问日志 / 代理 / 懒加载
└── images/
    ├── getattr_proxy.json    # 图源（typed JSON IR，可编辑重渲染）
    ├── getattr_proxy.html    # 交互示意图（浏览器打开）
    └── getattr_proxy.svg     # 双主题矢量图（本 README §2 内嵌）
```

`getattr_proxy.py` 内容：`1. DynamicAttributes` `__getattr__` 访问不存在属性时动态查找 / `2. AccessLogger` `__getattribute__` 记录所有属性读写 / `3. Proxy` 代理模式，属性转发到内部对象 / `4. LazyConfig` 懒加载，首次访问时触发加载 / `5. run_demo()` 交互式演示。

## 7. 面试要点

**Q1: `__getattr__` 和 `__getattribute__` 的区别？**

| | `__getattr__` | `__getattribute__` |
|---|---|---|
| 触发时机 | 常规查找**失败后** | **每次**属性访问 |
| 默认实现 | 抛出 `AttributeError` | 从 `__dict__` 等常规路径查找 |
| 自定义频率 | 高（安全） | 低（容易递归） |

**Q2: 为什么 `__getattribute__` 中不能用 `self.xxx`？**
`self.xxx` 本身就是属性访问，会再次调用 `__getattribute__`，导致无限递归。必须用 `object.__getattribute__(self, 'xxx')` 绕过自定义逻辑。同理，`__setattr__` 中设置自身属性必须用 `object.__setattr__(self, name, value)`。

**Q3: 代理模式为什么用 `__getattr__` 而不是 `__getattribute__`？**
用 `__getattr__` 更简单安全：Proxy 自身的属性（如 `_obj`）走常规查找，只有不存在的属性才转发到被代理对象。用 `__getattribute__` 需要手动区分"代理自身的属性"和"被代理对象的属性"，代码更复杂且容易出错。

**Q4: 属性描述符在查找链中的位置？**
数据描述符（同时定义 `__get__` + `__set__`/`__delete__`）优先级高于实例 `__dict__`，非数据描述符（只定义 `__get__`）优先级低于实例 `__dict__`。这也是 `property`、`classmethod`、`staticmethod` 的实现原理。

**Q5: 怎么验证 `__getattribute__` 是"每次都触发"？**
看本 demo 的访问日志：连 `logger.get_log()` 取方法本身都被记录成 `('get', 'get_log')`，连不存在的 `z` 也留下了 `('get', 'z')`——每次访问（无论成败）都经过了它。

## 8. 总结

1. **`__getattr__` 仅在属性不存在时触发**，适合动态属性、懒加载、默认值
2. **`__getattribute__` 每次访问都触发**，适合日志、校验、不可变对象，但必须用 `object.__getattribute__` 避免递归
3. **代理模式用 `__getattr__` 透明转发**，客户端无需知道真实对象
4. **属性查找链**：`__getattribute__` -> 数据描述符 -> `__dict__` -> 非数据描述符 -> `__getattr__` -> `AttributeError`

下一篇进入 [12_new_vs_init](../12_new_vs_init/README.md)：看 `__new__` 与 `__init__` 如何分工完成对象的创建与初始化。
