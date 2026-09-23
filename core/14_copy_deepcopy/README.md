# 14 · `copy` 与 `deepcopy`：浅拷贝与深拷贝的内存真相

> 类装饰器把状态都存在 `self` 里。可一旦你想"复制一份"这样的带状态对象，问题就来了：
> `=` 只是再绑一个名字，`copy.copy()` 复制外壳却共享内层，`copy.deepcopy()` 才彻底独立。
> 本实验用 Demo 逐步对比三者的内存行为——工程里最容易踩的一组坑。

## What

Python 中"复制一个对象"有三个层次，一句话心智模型：**`=` 只绑新名字，`copy.copy()` 换新外壳、共享内层，`copy.deepcopy()` 每层全新独立**。沿"源对象 → 复制操作 → 内层对象"逐列追踪：`assigned` 与 `original` 是同一个对象，`shallow` 的内层仍指向共享的 `[1, 2]`，只有 `deep` 拥有独立副本。

## Why

`=` 赋值只是绑定新名字，`copy.copy()` 做浅拷贝（共享内层可变对象），`copy.deepcopy()` 做深拷贝（递归复制所有层级的对象）。不看清楚会怎样：你以为复制出了一份独立数据，实际内层可变对象仍与原对象共享——一处修改，处处"见鬼"，这类共享引用 bug 在配置对象、默认参数、缓存场景里极为常见。本实验通过 Demo 演示赋值、浅拷贝、深拷贝在嵌套列表、不可变对象、自定义类和循环引用场景下的行为差异。

## How

```bash
cd core/14_copy_deepcopy
python3 copy_deepcopy.py       # 运行 = vs copy vs deepcopy 全场景对比 demo
```

真实输出示例：

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

### 三种复制的基础行为

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

### 修改传播规律

```
outer[0] = 99        → copy 和 deepcopy 都独立（替换外层引用）
outer[0][0] = 99     → copy 共享！（修改内层可变对象）
outer.append(x)      → copy 和 deepcopy 都独立（外层操作）
```

### 不可变对象的特殊行为

```python
a = (1, 2, [3, 4])
b = copy.copy(a)      # a is b == True（不可变，copy 返回自身）
c = copy.deepcopy(a)   # a is c == False（deepcopy 仍创建新对象）
```

对不可变对象（`tuple`、`int`、`str`、`frozenset`），`copy.copy()` 直接返回对象自身。但 tuple 内部包含可变对象时，差异依然存在：`a[2].append(5)` 之后 `b[2]` 是 `[3, 4, 5]`（共享），`c[2]` 是 `[3, 4]`（独立）。

### 自定义 `__copy__` 协议

```python
class Node:
    def __init__(self, val, next_=None):
        self.val = val
        self.next = next_

    def __copy__(self):
        """浅拷贝: 只复制当前节点，共享 next 链"""
        return Node(self.val, self.next)
```

类似地，`__deepcopy__(self, memo)` 可自定义深拷贝行为。

### 循环引用

```python
a = [1, 2]
a.append(a)            # 自引用：a[2] is a == True
b = copy.deepcopy(a)   # 正确处理！b[2] is b == True
```

## Deep Dive

**三种复制的差异浓缩在两行构造里——外壳换没换、内层共不共享**：

```python
original = [[1, 2], [3, 4]]
assigned = original                 # = ：连外壳都不换，is 判定 True
shallow  = copy.copy(original)      # 浅拷贝：外壳新建，内层 [1,2] 仍是同一引用
deep     = copy.deepcopy(original)  # 深拷贝：递归下探，每层都新建
```

`deepcopy` 敢无限递归的底气在 `memo`：递归过程中用 `id(obj) -> copied_obj` 记录已复制的对象，遇到重复引用直接复用，因此能正确处理任意复杂的循环引用，不会无限递归——这是 deepcopy 最精巧的设计点。

踩坑清单：

- **用 `id(...)` 数值下结论**：id 由内存分配器决定且地址可被复用（本机实测 `copy` 和 `deepcopy` 的 id 甚至相同），判断共享只认 `is`
- **以为浅拷贝"安全"**：`outer[0][0] = 99` 改的是内层可变对象，原对象和浅拷贝同时被改
- **tuple 内含可变元素**：`copy.copy` 返回自身，内层 list 的 `append` 在原对象和拷贝间双向可见

## Q&A

**Q1: `copy.copy()` 和切片 `[:]` 有什么区别？**
对于列表，`copy.copy(lst)` 和 `lst[:]` 效果相同，都是浅拷贝。但 `copy.copy()` 适用于所有容器类型（dict、set 等），而切片只适用于序列类型。

**Q2: `deepcopy` 的 `memo` 参数是什么？**
一个字典，递归过程中记录 `id(obj) -> copied_obj`。作用有两个：**去重**（同一对象只复制一次，保持引用共享关系）和**处理循环引用**（检测到已访问对象直接返回，防止无限递归）。

**Q3: 什么时候用 `copy`，什么时候用 `deepcopy`？**
浅拷贝适合结构扁平（元素全是不可变对象）或有意共享内层对象（多视图共享同一数据）；深拷贝适合嵌套结构且需要完全独立的副本。经验法则：不确定时用 `deepcopy`（更安全，但稍慢）。

**Q4: 字典和集合的拷贝行为？**
`d.copy()` 等价于 `copy.copy(d)`，都是浅拷贝；`copy.deepcopy(d)` 递归复制所有 key 和 value；`set.copy()` 同理。
