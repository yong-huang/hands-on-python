# 14 · `copy` 与 `deepcopy`：浅拷贝与深拷贝的内存真相

> `=` 只是再绑一个名字，`copy.copy()` 复制外壳却共享内层，`copy.deepcopy()`
> 才让每一层彻底独立。读完本篇，你能沿"外壳换没换、内层共不共享"判断任何
> 复制操作的行为，并避开共享引用这组常见 bug。

## Background

这节先看问题域：把一份数据"复制一份"为什么需要专门机制。最直觉的写法是
`b = a`——但 Python 里这只是给同一个对象再绑一个名字，`a` 和 `b` 是同一
样东西。对嵌套数据（列表里套列表这类结构），改 `b[0][0]`，`a[0][0]` 跟着
变。

工程师因此在需要独立副本的场景撞墙：保存配置快照后继续改原配置，快照
悄悄跟着变；把列表交给会修改它的函数，函数内的改动泄漏回调用方。这类共享
引用 bug 麻烦在症状离病根很远——出问题的代码与真正共享的那一行，往往隔了
好几层调用。

Python 标准库 `copy` 模块为此提供两级复制——只复制外壳与逐层复制（下一节
正式定义），并预留自定义复制行为的钩子，让"复制到多深"成为可控决策。

## What

本节给出三个复制层次的定义与心智模型。`=` 绑定新名字（零复制）；
`copy.copy()` 是浅拷贝（shallow copy，只新建最外层容器，内层对象仍共享）；
`copy.deepcopy()` 是深拷贝（deep copy，递归复制所有层级的对象）。

一句话心智模型：**`=` 只绑新名字，`copy.copy()` 换新外壳、共享内层，
`copy.deepcopy()` 每层全新独立**。

可以把嵌套对象想象成"合同正文加附件"：`=` 是给同一份文件再开一个入口；
`copy.copy()` 是正文重新打印、附件仍指向原件；`copy.deepcopy()` 是正文和
附件全部重新打印。但和打印不同的是：深拷贝遇到不可变对象（如 `tuple`）
不会逐层新建——不可变对象无法修改，实现上直接复用。

沿"源对象 → 复制操作 → 内层对象"追踪一遍（`is`：身份比较，判断两个名字
是否指向同一个对象）：`assigned` 与 `original` 是同一个对象，`shallow`
的内层仍指向共享的 `[1, 2]`，只有 `deep` 拥有独立副本。

## When to Use

这节给判断力：在做什么事的时候需要哪种复制，什么时候不需要复制。

- **保存快照/回滚点**：改动配置或状态前复制一份，之后随便改，快照不受
  影响——嵌套结构用 `deepcopy`
- **把可变数据交给会改它的函数**：调用前复制，避免内部修改泄漏回调用方
- **有意共享**：多视图共享同一份内层数据时，浅拷贝正是想要的行为，用它
  而不是 `deepcopy`

何时不用：元素全是不可变对象时共享引用没有风险，`=` 即可；`deepcopy`
更安全但稍慢（逐层新建的成本），不要无差别使用。经验法则：不确定时用
`deepcopy`。

同类方案对比：

| 方案 | 差异 | 什么时候选它 |
|---|---|---|
| `=` | 只绑新名字，零复制 | 不打算修改共享数据时 |
| 切片 `[:]` | 只适用于序列的浅拷贝 | 只要序列顶层副本 |
| `dict.copy()` / `set.copy()` | 等价 `copy.copy` 的浅拷贝 | 顶层字典/集合副本 |
| `copy.copy()` | 适用于所有容器的浅拷贝 | 扁平结构或有意共享内层 |
| `copy.deepcopy()` | 递归复制所有层级 | 嵌套结构需要完全独立 |

## Quick Start

### 运行与真实输出

前置条件：Python 3 标准库 `copy`，无第三方依赖。运行 demo：

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

[5] Memory identity summary:
  id(orig)          = 4355685824
  id(copy(orig))    = 4355686144
  id(deepcopy(orig))= 4355686144

[6] Decision guide:
  Use = (assignment): share the same object
  Use copy.copy():   new outer container, shared inner objects
  Use copy.deepcopy(): completely independent copy
  Rule: when in doubt, use deepcopy (slower but safe)
```

诚实预期：

- `[1]`-`[4]` 的输出是**确定性的**，每次运行一致
- `[5]` 的 `id(...)` 数值每次运行都不同（内存地址由运行时的内存分配器——负责为对象分配地址的组件——决定，每次运行都可能不同），且小对象可能复用刚释放的地址（本机实测 `copy` 和 `deepcopy` 的 id 甚至相同）—— **不要用 id 数值本身下结论**，判断共享要用 `is`
- CPython（python3 命令对应的官方解释器实现）会把小的整数和字符串缓存为共享单例——同一份对象在内存里只存一份、多处复用，称为驻留（interning）。这会影响对不可变对象的行为观察，但 demo 中的 list/tuple 场景不受影响

### 代码走读

demo 覆盖赋值、浅拷贝、深拷贝在嵌套列表、不可变对象、自定义类和循环引用
下的行为，对应输出的 `[1]`–`[6]`。

基础行为——这段在做什么：三种方式各取一份，随后修改内层元素，观察传播
范围。

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

`[2]`–`[4]` 的不可变对象、自定义协议与循环引用，在 How It Works 逐个
展开。

## How It Works

这节解释"外壳换没换、内层共不共享"在代码层面由什么决定，并把输出
`[2]`–`[4]` 的现象对应到机制上。

### 外壳与内层：两行构造看差异

三种复制的差异浓缩在两行构造里——外壳换没换、内层共不共享：

```python
original = [[1, 2], [3, 4]]
assigned = original                 # = ：连外壳都不换，is 判定 True
shallow  = copy.copy(original)      # 浅拷贝：外壳新建，内层 [1,2] 仍是同一引用
deep     = copy.deepcopy(original)  # 深拷贝：递归下探，每层都新建
```

对照输出 `[1]`：`original is assigned` 为 `True`，`shallow` 与 `deep` 的
外壳都是新的；修改 `original[0][0]` 后只有 `deep` 保持 `1`。

修改能不能传播，取决于操作落在哪一层：

```
outer[0] = 99        → copy 和 deepcopy 都独立（替换外层引用）
outer[0][0] = 99     → copy 共享！（修改内层可变对象）
outer.append(x)      → copy 和 deepcopy 都独立（外层操作）
```

替换外层引用、增删外层元素都不传播；**修改内层可变对象**才会穿透浅拷贝。

### 不可变对象：`copy` 返回自身

这段在做什么：对含可变元素的 tuple 分别做浅拷贝与深拷贝，再改内层 list
看差异。

```python
a = (1, 2, [3, 4])
b = copy.copy(a)      # a is b == True（不可变，copy 返回自身）
c = copy.deepcopy(a)   # a is c == False（deepcopy 仍创建新对象）
```

对不可变对象（`tuple`、`int`、`str`、`frozenset`），`copy.copy()` 直接
返回对象自身。

但 tuple 内部包含可变对象时，差异依然存在：`a[2].append(5)` 之后 `b[2]`
是 `[3, 4, 5]`（共享），`c[2]` 是 `[3, 4]`（独立）——即输出 `[2]` 的
两行。

### 自定义拷贝协议

这段在做什么：`Node` 用 `__copy__` 声明自己的浅拷贝方式——只复制当前
节点、共享 `next` 链。

```python
class Node:
    def __init__(self, val, next_=None):
        self.val = val
        self.next = next_

    def __copy__(self):
        """浅拷贝: 只复制当前节点，共享 next 链"""
        return Node(self.val, self.next)
```

协议（protocol，按约定实现特定方法即可参与对应机制）的意义在此：默认
复制行为不合适时，类可自定义复制深度。类似地，`__deepcopy__(self, memo)`
可自定义深拷贝行为。

对照输出 `[3]`：`n3 is n3_copy` 为 `False`（外壳新建），
`n3.next is n3_copy.next` 为 `True`（按协议共享）。

### 循环引用与 `memo`

这段在做什么：让列表追加自身，构成循环引用（对象直接或间接引用自身的
结构），再对它做 deepcopy。

```python
a = [1, 2]
a.append(a)            # 自引用：a[2] is a == True
b = copy.deepcopy(a)   # 正确处理！b[2] is b == True
```

`deepcopy` 敢无限递归的底气在 `memo`：递归过程中用 `id(obj) -> copied_obj`
（`id()` 返回对象身份编号）记录已复制的对象，遇到重复引用直接复用。

作用有两个：**去重**（同一对象只复制一次，保持引用共享关系）和**处理
循环引用**（检测到已访问对象直接返回，防止无限递归）。输出 `[4]` 里
`b[2] is b` 为 `True`，循环结构被原样保留。

输出 `[5]` 的 Memory identity summary 逐行打印三份对象的 `id`——数值每
次运行都不同，只当"地址会变"的提醒看，判断共享仍只认 `is`。

输出 `[6]` 的 Decision guide 给出选择法则：`=` 共享同一对象，
`copy.copy()` 换外壳、共享内层，`copy.deepcopy()` 完全独立——拿不准
就用 `deepcopy`。

## Pitfalls & Q&A

这节汇总三个经典坑。共同根源：复制行为由"哪一层被操作"决定，直觉在嵌套
结构上经常失灵。

**坑 1：用 `id(...)` 数值下结论。**
现象：比较两个对象的 `id` 数值判断共享，结论时对时错。
原因：id 由内存分配器决定，地址可被复用——诚实预期里实测过 `copy` 与
`deepcopy` 的 id 甚至可能相同。

解法：判断共享只认 `is`。

**坑 2：以为浅拷贝"安全"。**
现象：执行 `outer[0][0] = 99` 后，原对象和浅拷贝同时被改。
原因：这行改的是内层可变对象，浅拷贝与原对象共享内层。
解法：需要独立副本就 `deepcopy`；只做外层替换、增删则浅拷贝够用。

**坑 3：tuple 内含可变元素。**
现象：`copy.copy` 得到的元组，其内层 list `append` 后原对象同步可见。
原因：`copy.copy` 对不可变对象返回自身，内层 list 仍共享。
解法：内层含可变对象时用 `deepcopy`。

**Q：`copy.copy()` 和切片 `[:]` 有什么区别？**

对列表，`copy.copy(lst)` 和 `lst[:]` 效果相同，都是浅拷贝；差别在适用
范围——切片只适用于序列类型，`copy.copy()` 适用于所有容器（dict、set
等），选择对比见 When to Use 的方案表。
