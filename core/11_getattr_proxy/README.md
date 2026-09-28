# 11 · `__getattr__` 与 `__getattribute__`：属性访问控制与动态代理

> `obj.name` 一行代码背后是一条属性查找链，链上有两个可自定义的钩子：
> `__getattr__`（常规查找失败才触发）与 `__getattribute__`（每次访问都触发）。
> 读完本篇，你能分清两者的触发时机，并动手实现动态属性、访问日志、代理与懒加载。

## Background

这节回答一个问题：为什么 Python 要把"属性访问"本身做成可拦截的协议。
先看没有拦截手段时，两类典型需求是怎么做的。

第一类是包装对象。在不修改目标类的前提下加一层包装，常规做法是手写转发：
包装类为被包装对象的每个属性写一个同名转发方法。痛点在规模与同步——第三方
客户端类有 30 个方法，包装类就要手写 30 个转发；上游新增接口后漏写一个，
错误要到运行时那一行才暴露。

第二类是横切逻辑——贯穿多个方法的通用逻辑（日志、权限）。想记录"每一次
属性访问"，常规做法是在每个方法开头插入日志语句，代码重复且容易遗漏。

Python 的应对是把属性访问设计成协议：类只要定义了特定的双下划线方法
（dunder method，名称前后各有两个下划线的特殊方法），解释器在属性访问时
就会调用它。包装与日志从"逐个方法手写"变成"一个钩子接管全部"。

## What

本节给出两个钩子的定义，并用一条五级查找链建立心智模型。

`__getattr__(self, name)` 是兜底钩子——常规属性查找**失败后**才被调用；
`__getattribute__(self, name)` 是拦截钩子——**每次**属性访问都先经过它。
完整的查找链有五级：

`__getattribute__` → 数据描述符 → 实例 `__dict__`（对象存放自身属性的内置
字典）→ 非数据描述符 → `__getattr__`

描述符（descriptor，定义了 `__get__` 等取值协议的类属性）的细节在
How It Works 展开，这里先记住顺序。

可以把这条链想象成公司前台：每个访客（属性访问）都必经前台
（`__getattribute__`），前台按登记簿（`__dict__` 与描述符）查到就直接
放行，都查不到时才由保安（`__getattr__`）做最后处理。

但和真实前台不同的是：这里的"必经"会递归——自定义 `__getattribute__` 后，
读对象自己的任何属性也会再次进入它，处理不当就无限递归。

顺着 `proxy.config` 走一遍：实例和类里都没有 `config` → 触发 `__getattr__`
→ 转发给真实对象；目标对象也没有 → 抛 `AttributeError`（属性不存在时
Python 抛的内置异常）。

这条"失败才转发"的路径，正是代理（proxy，替身对象，把调用转交给真实
对象）和懒加载（首次访问时才加载资源）都选 `__getattr__` 做钩子的原因。

## When to Use

这节给判断力：什么场景值得用这两个钩子，什么场景不该用。

- **包装第三方对象或远程接口**：写 API wrapper（对第三方接口的封装）时，
  用 `__getattr__` 透明转发，不必逐个方法手写转发代码
- **懒加载**：配置、连接、大文件等重资源推迟到首次属性访问时才加载，
  `__getattr__` 是最自然的实现位置
- **横切逻辑**：访问日志、权限校验、不可变对象（创建后不允许修改的对象）
  需要检查每一次访问，用 `__getattribute__`

何时不用：属性集合固定且数量少时，直接显式定义属性更简单、可读性更好；
`__getattribute__` 位于每次访问的必经路径上，性能敏感的热点代码慎用，
自定义它也极容易写出无限递归。

同类方案对比：

| 方案 | 差异 | 什么时候选它 |
|---|---|---|
| `property`（把方法包装成属性读写的内置机制） | 只拦截单个具名属性 | 只需控制一两个属性（见 lab 03） |
| 描述符类 | 一套拦截逻辑复用到多个类 | 多个类共享同一套校验/类型逻辑 |
| `__getattr__` | 兜底拦截所有找不到的属性 | 属性名事先不确定：代理、懒加载 |
| `__getattribute__` | 拦截每一次访问 | 需要全局日志/权限/不可变性 |

## Quick Start

### 运行与真实输出

前置条件：Python 3，无第三方依赖。运行 demo 并对照输出读代码：

```bash
cd core/11_getattr_proxy
python3 getattr_proxy.py          # 运行 demo
```

真实输出示例：

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

[5] Key difference:
  __getattribute__: ALWAYS called (every attr access)
  __getattr__:      ONLY called when normal lookup FAILS
  Rule: use __getattr__ for dynamic/missing attrs
        use __getattribute__ for logging/validation on ALL attrs
  WARNING: never use self.xxx inside __getattribute__!
           Use object.__getattribute__(self, 'xxx') instead
```

诚实预期：

- demo 输出是**确定性的**（不涉及计时/并发），每次运行结果一致
- `[2]` 的 Access log 里会出现 `('get', 'get_log')` —— 因为 `logger.get_log()` 本身也是属性访问，被 `__getattribute__` 记录了下来，这正是"每次访问都触发"的证据，不是 bug
- 本 demo 不演示无限递归的实际崩溃（`RecursionError`），只以文字警告形式提示（即输出 [5] 段的 WARNING 行）；想验证可自行在 `__getattribute__` 里写 `self._log` 触发

### 代码走读

demo 由五个环节组成，对应输出的 `[1]`–`[5]`。

`[1]` 动态属性——这段在做什么：`__getattr__` 只在常规查找失败后被调用，
数据字典里查得到就返回值，查不到就抛 `AttributeError`。

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

适合：动态属性、默认值、向后兼容的重命名属性。

`[2]` 访问日志——这段在做什么：每次访问都进入 `__getattribute__`；读自身
内部状态必须改用 `object.__getattribute__`，否则会再次触发自身。

```python
class AccessLogger:
    def __getattribute__(self, name):
        log = object.__getattribute__(self, '_log')   # 必须用 object.__getattribute__
        if name.startswith('_'):
            return object.__getattribute__(self, name)
        log.append(("get", name))
        ...
```

适合：访问日志、权限校验、不可变对象。

`[3]` 与 `[4]` 的 Proxy、LazyConfig 两个类涉及读/写两条钩子的配合，
放到 How It Works 一并讲解。

## How It Works

这节把 What 节的五级查找链落到代码，并解释 Quick Start 输出里各现象的
来源。

### 五级查找链：`obj.name` 的完整旅程

按解释器的执行顺序：

1. 进入 `__getattribute__`——必经的一步，默认实现由它发起后续查找
2. 查**数据描述符**——同时定义了 `__get__` 与 `__set__`/`__delete__` 的类属性，命中即返回
3. 查实例 `__dict__`——对象自带的属性字典
4. 查**非数据描述符**——只定义 `__get__` 的类属性
5. 前四级全部落空才调用 `__getattr__`；它也没有（或未定义）就抛 `AttributeError`

输出里两处现象与这条链一一对应。`[2]` 的 Access log 出现
`('get', 'get_log')`，对应第 1 级必经——`logger.get_log()` 这个调用本身
就是一次属性访问。

`[4]` 里 `loaded` 从 `False` 变 `True`，对应第 5 级兜底——`cfg.host` 在
前四级全部落空后进入 `__getattr__`，触发首次加载。

### 代理与懒加载：读兜底、写分流

这段在做什么：Proxy 的写操作走 `__setattr__` 分流（自身的 `_obj` 留下，
其余转发给真实对象），读操作走 `__getattr__` 兜底；LazyConfig 在首次访问
时才调用 `load()`，之后从 `_cache` 取值。

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

class LazyConfig:
    def __getattr__(self, name):
        if not object.__getattribute__(self, '_loaded'):
            self.load()                           # 首次访问时才加载
        cache = object.__getattribute__(self, '_cache')
        if name in cache:
            return cache[name]
        raise AttributeError(f"'{name}' not in config")
```

代理把属性访问**透明转发**到内部对象（典型用途：API wrapper、远程调用、
访问控制）；懒加载让配置/资源在首次访问时才加载。

最核心的一处是 Proxy 的初始化与转发钩子的配合：

```python
def __init__(self, obj):
    object.__setattr__(self, '_obj', obj)   # 为什么：绕过下面的自定义 __setattr__，
                                            # 否则初始化 _obj 就会被转发给还没绑定的对象

def __getattr__(self, name):
    return getattr(self._obj, name)         # 为什么安全：_obj 是真实存在的属性，
                                            # 走常规查找命中，不会进这里——只有
                                            # "代理身上没有的属性"才被转发出去
```

`__init__` 不写 `self._obj = obj`，是为了绕过自定义 `__setattr__`；
`__getattr__` 之所以安全，是因为 `_obj` 永远能在第 3 级命中、不会兜底进
自身，转发不会打转。

## Pitfalls & Q&A

这节汇总两个经典坑与两个常见疑问。坑的共同根源是同一件事：自己写的钩子
也在拦截"读自己的属性"。

**坑 1：`__getattribute__` 里写 `self.xxx` 必无限递归。**
现象：一访问属性就抛 `RecursionError`（递归深度超过解释器上限时抛出的
异常）。原因：`self.xxx` 本身就是属性访问，会再次调用 `__getattribute__`。

解法：用 `object.__getattribute__(self, 'xxx')` 绕过自定义逻辑；
`__setattr__` 同理要用 `object.__setattr__`。

**坑 2：懒加载/代理读自身状态误触发自己。**
现象：在 `__getattr__` 里写 `self._loaded` 这类访问，可能再次进入
`__getattr__`，最终 `RecursionError`。

原因：`self._loaded` 本身也是一次常规查找，若该属性此刻不存在，会再次
兜底进入自身。

解法：读自身状态统一用 `object.__getattribute__`——`LazyConfig` 里查
`_loaded`/`_cache` 都绕开常规链，避免误触发自身。

**Q1：`__getattr__` 和 `__getattribute__` 的区别？**

触发时机与默认行为见 What 与 How It Works 的查找链，补充一条决策准则：
要"兜底"语义用 `__getattr__`（自定义安全、常用），要"全程"语义才用
`__getattribute__`（自定义风险高、少用）。

**Q2：代理模式为什么用 `__getattr__` 而不是 `__getattribute__`？**

用 `__getattr__` 更简单安全：Proxy 自身的属性（如 `_obj`）走常规查找，
只有不存在的属性才转发到被代理对象。用 `__getattribute__` 需要手动区分
"代理自身的属性"和"被代理对象的属性"，代码更复杂且容易出错。

**Q3：数据描述符和非数据描述符在查找链中的位置差在哪？**

数据描述符（同时定义 `__get__` + `__set__`/`__delete__`）优先级高于实例
`__dict__`；非数据描述符（只定义 `__get__`）则低于它。`property`、
`classmethod`、`staticmethod` 就按此实现（见 lab 03）。
