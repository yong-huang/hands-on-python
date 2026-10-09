自定义类的对象一做 p1 + p2，直接 TypeError。

一打印，`<Point object at 0x…>`——一串内存地址，啥也看不出来。

---

放进 set 去重？也全靠对象 id，值一样也不去重。

这些都是因为类没有实现魔术方法——dunder methods。

---

Python 的运算符和内置函数，背后全是它们。

a + b 调 a.__add__(b)，len(obj) 调 obj.__len__()。

---

一句话心智模型：运算符先问左操作数的类型。

不认识，返回 NotImplemented 哨兵，解释器再问右操作数的反射方法。

---

先看最基础的两个：__repr__ 和 __str__。

一个给调试，一个给显示。

---

repr 要 unambiguous——能还原对象。

str 要 human-readable——给人看。

---

真机：repr(p) 是 Point(3, 4)，str(p) 是 (3, 4)。

---

再看比较。__eq__ 管等于，__hash__ 管哈希。

两个必须配套——a == b 则 hash(a) == hash(b)。

---

只定义 __eq__ 不定义 __hash__？

Python 自动把 __hash__ 设为 None，对象变不可哈希，dict 直接 TypeError。

---

运算符重载也不难。

__add__ 加法，__mul__ 乘法，__abs__ 绝对值，__bool__ 真假判断。

---

真机：Point(3,4) + Point(1,2) = (4,6)，abs(Point(3,4)) = 5.0。

---

不想手写全套比较方法？

@total_ordering：只写 __eq__ 加 __lt__，其余自动生成。

---

@dataclass 更省：__init__、__repr__、__eq__ 全自动。

加 order=True 再送全套比较，加 frozen=True 保留 __hash__。

---

容器协议也行：__len__ 管长度，__getitem__ 管取值，__iter__ 管迭代。

RingBuffer 就是这么做的。

---

完整代码在 hands-on-python 仓库，python3 一跑就有体感。

链接在评论区，下期见。
