# 22 · 模块与导入系统：sys.modules、`__main__` 与循环导入

> 并发实验里两次踩中同一个坑：spawn 子进程 re-import `__main__`，入口代码没守卫就重放。
> 这背后是 import 的完整机制：**import 查 `sys.modules` 缓存 → 没有就执行模块体（并先入缓存）→ 绑定名字**。模块体每个进程只执行一次、直接运行与被导入行为不同、模块顶部互相 import 会拿到"半初始化模块"——本实验把这四件事全部做成可断言的实测。

## What

一句话心智模型：**import = 查缓存 → 执行模块体 → 绑定名字**。`sys.modules` 是模块缓存表，同一模块二次 import 拿到**同一个对象**（模块体不重跑）；直接运行的模块 `__name__` 是 `"__main__"`，被导入时是模块名——这就是 `if __name__ == "__main__":` 守卫的原理；模块顶部互相 import 时，后导入方会拿到一个**只执行到一半的模块对象**，这就是循环导入报错的根源。

## Why

不理解 import 机制会怎样：模块级副作用（连接、注册）在"以为没执行"的时候已经执行；入口脚本不写守卫，被测试或子进程导入时整段重放；两个模块互相依赖时 import 顺序决定成败。concurrency 系列的 spawn 陷阱、`docs/` 清单里的循环导入经验，全部回到这一课。

## How

```bash
cd core/22_import_system
python3 import_system.py    # 完整演示（4 个小节，内置断言）
```

真实输出：

```
=== 模块与导入系统 ===

[1] import 只执行一次（sys.modules 缓存）:
  首次 import counter_mod（注意模块体打印）：
  [counter_mod] 模块体执行（每次进程只应出现一次）
  第二次 import counter_mod（静默——缓存命中）：
  两次 import 拿到同一对象: True
  sys.modules['counter_mod'].get_name() = 'counter_mod'

[2] __name__ == '__main__' 守卫:
  [greeter] 模块体执行，__name__ = 'greeter'
  被导入: __name__='greeter'，守卫块未触发
  导入后照常调用: 'hello, imported'
  直接运行 python3 greeter.py：
      [greeter] 模块体执行，__name__ = '__main__'
      [greeter] 作为主程序运行: hello, world

[3] 循环导入：坏形态复现 + 延迟导入修复:
  坏形态（顶部互相 import）在子进程里复现：
    ImportError: cannot import name 'Loud' from 'bad_a'
  修好的形态（函数体内延迟 import）：
    Loud.speak() = 'LOUD! Loud'

[4] 包与相对导入:
  Circle() 的 describe() = 'a circle'（来自 shapepkg.base 的相对导入）
  模块坐标: 'shapepkg.circle'

全部断言通过 ✓ 缓存单次执行、守卫分流行为、循环导入复现与修复、相对导入
```

诚实预期：

- demo 输出**确定性**（循环导入的报错在子进程复现，绝对路径提示已剥离）
- 坏形态的报错文案随版本变化：3.13- 报 `ImportError: cannot import name ... (most likely due to a circular import)`，3.14+ 附加"同名文件改名"提示——语义相同

### sys.modules：缓存命中即同对象

```python
import counter_mod              # 第一次：执行模块体 + 塞进 sys.modules
import counter_mod as again     # 第二次：缓存命中，模块体不重跑

counter_mod is again            # True —— 同一个模块对象
```

模块级副作用（连接、注册、`print`）因此每个进程只发生一次；"配置在 import 时读取"（12-factor 的注入时机）也源于此——环境变量必须在**首次 import 之前**就位。

### `__name__ == "__main__"`：直接运行与被导入分流

```python
if __name__ == "__main__":
    main()     # 直接运行才执行；被 import 时 __name__ 是模块名，整段跳过
```

直接运行 `python3 greeter.py` 时 `__name__ == "__main__"`，守卫块触发；被 import 时 `__name__ == "greeter"`，守卫块跳过但函数照常可用——测试导入、spawn 子进程 re-import 靠这条分流保证入口代码不重放。

### 循环导入：坏形态与延迟导入

```python
# 坏形态：bad_a 顶部 from bad_b import shout，bad_b 顶部 from bad_a import Loud
# → 两边互相等待对方"初始化完成"，后到者拿到只执行到一半的模块
# → ImportError: cannot import name 'Loud' from 'bad_a'

# 修好的形态：把 import 挪进函数体，调用时两个模块都已初始化
def speak():
    from good_b import shout
    return "LOUD!" + shout()
```

### 包与相对导入

```python
# shapepkg/circle.py
from .base import Shape        # 相对导入：同包成员

class Circle(Shape): ...
```

目录 + `__init__.py` 成包；`from .base import Shape` 引用同包模块，模块坐标是 `shapepkg.circle`。

## Deep Dive

**循环导入的病根是"import 时的半初始化模块"**：模块 A 顶部 import B，B 顶部 import A——解释器先把 A 塞进 `sys.modules`（此时 A 的名字一个都没定义），执行到 B 的 `from bad_a import Loud` 时去 A 里找 `Loud`，找不到就报 `ImportError`。三种解法按优先级：① 重新划分模块消除循环（治本）；② 把 import 挪进函数体（延迟到调用时，两个模块都已就绪）；③ `import bad_a` 整模块引用而非 `from` 取名（引用半成品模块对象不报错，但访问未定义名字仍会炸——只是把错误推迟）。

踩坑清单：

- **模块级副作用**：连接数据库、注册信号、写文件放进模块体——任何 import 者都会触发它；副作用要么进函数，要么进 `__main__` 守卫
- **环境变量注入晚于 import**：读配置的模块在被 import 时就绑定了值（并发实验里 SHORTENER_DB 的坑）——注入必须先于首次 import
- **脚本名遮蔽标准库**：实验目录里建 `random.py`/`json.py`，`sys.path[0]` 是脚本目录，标准库会被自己的文件遮蔽——报错往往出现在别的 import 处，极难排查
- **`from x import *`**：污染命名空间，让 LEGB 分析失效；显式列出名字

## Q&A

**Q1: spawn 子进程为什么会重放入口代码？**
spawn 启动的新解释器要 import 主模块来定位可 pickle 的目标；`__main__` 模块被重新执行，顶层的 `p.start()` 等入口代码就会重放——`__main__` 守卫正是为此存在（见 concurrency/05 的实测）。

**Q2: 为什么"函数内 import"不算坏味道？**
顶层 import 是依赖声明，函数内 import 是延迟解析：处理循环导入、可选依赖（缺了只在用到时报错）、昂贵模块的按需加载。代价是每次调用有一次 `sys.modules` 查表——缓存命中，成本可忽略。

**Q3: `if __name__ == "__main__"` 里的代码能被测试吗？**
不能直接测（它只在直接运行时执行）。可测的做法：逻辑放函数，守卫块只调 `main()`——这也是所有实验脚本"逻辑与入口分离"的原因。
