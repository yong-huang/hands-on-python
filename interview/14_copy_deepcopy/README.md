# 14 · `copy` 与 `deepcopy`：浅拷贝与深拷贝的内存真相

> 上一实验用 `__call__` 让实例像函数一样被调用，类装饰器把状态都存在 `self` 里。
> 可一旦你想"复制一份"这样的带状态对象，问题就来了：`=` 只是再绑一个名字，
> `copy.copy()` 复制外壳却共享内层，`copy.deepcopy()` 才彻底独立。
> 本实验用 Demo 逐步对比三者的内存行为——面试几乎必考。

## 1. 为什么需要它

Python 中"复制一个对象"看似简单，实则暗藏玄机。`=` 赋值只是绑定新名字，`copy.copy()` 做浅拷贝（共享内层可变对象），`copy.deepcopy()` 做深拷贝（递归复制所有层级的对象）。三者在内存行为上截然不同，面试中几乎必考。不看清楚会怎样：你以为复制出了一份独立数据，实际内层可变对象仍与原对象共享——一处修改，处处"见鬼"，这类共享引用 bug 在配置对象、默认参数、缓存场景里极为常见。本实验通过 Demo 演示赋值、浅拷贝、深拷贝在嵌套列表、不可变对象、自定义类和循环引用场景下的行为差异，并配上内存模型可视化。

## 2. 总览：核心机制一图看懂

![三种复制的内存传播：= / copy / deepcopy](images/copy_deepcopy.svg)

一句话心智模型：**`=` 只绑新名字，`copy.copy()` 换新外壳、共享内层，`copy.deepcopy()` 每层全新独立**。看图时沿"源对象 → 复制操作 → 新名字 → 内层对象"逐列追踪：`assigned` 与 `original` 汇成同一个对象，`shallow` 的内层仍指向共享的 `[1, 2]`，只有 `deep` 拥有独立副本——三种复制对内层可变对象的态度一目了然。

> 🌐 **交互版**：[在线打开（GitHub Pages）](https://yong-huang.github.io/hands-on-python/interview/14_copy_deepcopy/images/copy_deepcopy.html)
> （或本地打开 [`images/copy_deepcopy.html`](images/copy_deepcopy.html)）。

## 3. 快速开始

```bash
cd interview/14_copy_deepcopy
python3 copy_deepcopy.py       # 运行 = vs copy vs deepcopy 全场景对比 demo
```

真实输出示例（macOS, CPython 3.10）：

```
[1] Assignment vs Copy vs Deepcopy:
  original[0][0] = 99:
    assigned[0][0] = 99  (shared!)
    shallow[0][0]  = 99   (shared!)
    deep[0][0]     = 1     (independent)
    original is assigned: True
    original is shallow:  False
    original is deep:     False

[2] Immutable objects:
  a = (1, 2, [3, 4])
  a is b (copy): True  (tuple copy returns self)
  a is c (deepcopy): False  (deepcopy creates new)
  a[2].append(5):
    b[2] = [3, 4, 5]  (shared inner list!)
    c[2] = [3, 4]  (independent)

[3] Custom __copy__ (Node):
  Original: 1 -> 2 -> 3 -> None
  Copy:     1 -> 2 -> 3 -> None
  n3 is n3_copy: False
  n3.next is n3_copy.next: True  (shared!)

[4] Cyclic reference:
  a = [1, 2, a]  (cyclic)
  a[2] is a: True
  deepcopy(a): OK
  b[2] is b: True  (cycle preserved)
```

诚实预期（本机实测）：

- `[1]`-`[4]` 的输出是**确定性的**，每次运行一致
- `[5]` 的 `id(...)` 数值每次运行都不同（内存地址由分配器决定），且小对象可能复用刚释放的地址（本机实测 `copy` 和 `deepcopy` 的 id 甚至相同）—— **不要用 id 数值本身下结论**，判断共享要用 `is`
- CPython 的小整数/字符串驻留（interning）会影响不可变对象的行为观察，但 demo 中的 list/tuple 场景不受影响

## 4. 核心概念

### 4.1 赋值 (=) vs 浅拷贝 vs 深拷贝

```python
original = [[1, 2], [3, 4]]
assigned = original       # = 赋值：同一对象
shallow  = copy.copy(original)   # 浅拷贝：外层新，内层共享
deep     = copy.deepcopy(original) # 深拷贝：全部独立
```

修改内层元素 `original[0][0] = 99` 后：

| 操作 | `assigned` | `shallow` | `deep` |
|:---|:---|:---|:---|
| `original is x` | `True` | `False` | `False` |
| `x[0][0]` 的值 | **99（共享）** | **99（共享）** | **1（独立）** |

`=` 赋值不创建副本，两个名字指向同一个对象；`copy.copy()` 创建了新的外层列表，但内层子列表仍然是同一个引用；`copy.deepcopy()` 递归复制所有层级的对象，完全独立。

### 4.2 修改传播规律

```
outer[0] = 99        → copy 和 deepcopy 都独立（替换外层引用）
outer[0][0] = 99     → copy 共享！（修改内层可变对象）
outer.append(x)      → copy 和 deepcopy 都独立（外层操作）
```

**关键规则**：浅拷贝只保证外层容器独立，修改内层可变对象会同时影响原对象和浅拷贝。这就是浅拷贝最容易被忽视的坑。

### 4.3 不可变对象的特殊行为

```python
a = (1, 2, [3, 4])
b = copy.copy(a)      # a is b == True（不可变，copy 返回自身）
c = copy.deepcopy(a)   # a is c == False（deepcopy 仍创建新对象）
```

对不可变对象（`tuple`、`int`、`str`、`frozenset`），`copy.copy()` 直接返回对象自身（因为不可变，无需复制）。但注意 tuple 内部包含可变对象时，`copy` 和 `deepcopy` 的差异依然存在：

```python
a[2].append(5)  # 修改内部可变列表
b[2]  # [3, 4, 5] —— 共享！
c[2]  # [3, 4]    —— 独立
```

### 4.4 自定义 __copy__ 协议

通过实现 `__copy__()` 方法，可以自定义类的浅拷贝行为：

```python
class Node:
    def __init__(self, val, next_=None):
        self.val = val
        self.next = next_

    def __copy__(self):
        """浅拷贝: 只复制当前节点，共享 next 链"""
        return Node(self.val, self.next)
```

```python
n3 = Node(1, Node(2, Node(3)))  # 1 -> 2 -> 3 -> None
n3_copy = copy.copy(n3)
n3 is n3_copy           # False（新对象）
n3.next is n3_copy.next # True（共享后续链）
```

类似地，`__deepcopy__(memo)` 可自定义深拷贝行为。`memo` 字典用于处理循环引用的去重。

### 4.5 循环引用

```python
a = [1, 2]
a.append(a)  # 自引用：a[2] is a == True
b = copy.deepcopy(a)  # 正确处理！b[2] is b == True
```

`deepcopy` 通过 `memo` 字典记录已复制的对象 id，遇到重复引用时直接复用，因此能正确处理任意复杂的循环引用，不会无限递归。这是面试中高频追问点。

## 5. 关键代码解析

三种复制的差异浓缩在两行构造里——**外壳换没换、内层共不共享**：

```python
original = [[1, 2], [3, 4]]
assigned = original                 # = ：连外壳都不换，is 判定 True
shallow  = copy.copy(original)      # 浅拷贝：外壳新建，内层 [1,2] 仍是同一引用
deep     = copy.deepcopy(original)  # 深拷贝：递归下探，每层都新建
```

`deepcopy` 敢无限递归的底气在 `memo`：递归过程中用 `id(obj) -> copied_obj` 记录已复制的对象，重复引用直接复用。

坑清单：

- **用 `id(...)` 数值下结论**：id 由内存分配器决定且地址可被复用（本机实测 `copy` 和 `deepcopy` 的 id 甚至相同），判断共享只认 `is`
- **以为浅拷贝"安全"**：`outer[0][0] = 99` 改的是内层可变对象，原对象和浅拷贝同时被改
- **tuple 内含可变元素**：`copy.copy` 返回自身，内层 list 的 `append` 在原对象和拷贝间双向可见
- **示意图中的内存布局是示意数据**（展示三种复制的传播模式），不是某次运行的实录

## 6. 文件结构

```
14_copy_deepcopy/
├── README.md                        # 本教程文档
├── copy_deepcopy.py                 # 主演示脚本：= vs copy vs deepcopy 全场景对比
└── images/
    ├── copy_deepcopy.json   # 图源（typed JSON IR，可编辑重渲染）
    ├── copy_deepcopy.html   # 交互示意图（浏览器打开）
    └── copy_deepcopy.svg    # 双主题矢量图（本 README §2 内嵌）
```

`copy_deepcopy.py` 内容：`1. demo_basics()` 基础对比 / `2. demo_immutable()` 不可变对象 copy 行为 / `3. Node + __copy__()` 自定义浅拷贝（链表节点） / `4. demo_cyclic()` deepcopy 处理循环引用 / `5. run_demo()` 汇总演示 + 内存 id 对比。

## 7. 面试要点

**Q1: 浅拷贝之后修改内层元素会怎样？**
替换外层引用（`outer[0] = 99`、`outer.append(x)`）双方独立；修改内层可变对象（`outer[0][0] = 99`）原对象和浅拷贝同时被改——浅拷贝只保证外层容器独立。

**Q2: `copy.copy()` 和切片 `[:]` 有什么区别？**
对于列表，`copy.copy(lst)` 和 `lst[:]` 效果相同，都是浅拷贝。但 `copy.copy()` 适用于所有容器类型（dict、set 等），而切片只适用于序列类型。

**Q3: `deepcopy` 的 `memo` 参数是什么？**
一个字典，递归过程中记录 `id(obj) -> copied_obj`。作用有两个：**去重**（同一对象只复制一次，保持引用共享关系）和**处理循环引用**（检测到已访问对象直接返回，防止无限递归）。

**Q4: 什么时候用 `copy`，什么时候用 `deepcopy`？**
浅拷贝适合结构扁平（元素全是不可变对象）或有意共享内层对象（多视图共享同一数据）；深拷贝适合嵌套结构且需要完全独立的副本。经验法则：不确定时用 `deepcopy`（更安全，但稍慢）。

**Q5: 字典和集合的拷贝行为？**
`d.copy()` 等价于 `copy.copy(d)`，都是浅拷贝；`copy.deepcopy(d)` 递归复制所有 key 和 value；`set.copy()` 同理。

## 8. 总结

1. **`=` 赋值不创建副本**，只是给同一对象绑定新名字
2. **`copy.copy()` 浅拷贝**：外层容器独立，内层可变对象共享
3. **`copy.deepcopy()` 深拷贝**：递归复制所有层级，完全独立
4. **不可变对象 `copy()` 返回自身**，但 `deepcopy()` 仍创建新对象
5. **`__copy__` / `__deepcopy__`** 可自定义拷贝行为
6. **`deepcopy` 通过 `memo` 字典处理循环引用**，面试高频追问

下一篇进入 [15_args_kwargs](../15_args_kwargs/README.md)：看 `*args` / `**kwargs` 如何实现灵活的参数传递。
