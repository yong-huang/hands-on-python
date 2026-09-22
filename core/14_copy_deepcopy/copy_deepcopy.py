"""
copy / deepcopy —— 浅拷贝与深拷贝
核心要点: = vs copy vs deepcopy、可变/不可变对象、循环引用、__copy__

赋值(=)不创建副本，copy.copy()做浅拷贝（共享内层可变对象），
copy.deepcopy()做深拷贝（递归复制所有对象）。

核心概念:
- = 赋值: 只是绑定新名字，共享同一对象
- 浅拷贝: 复制外层容器，内层对象仍是引用
- 深拷贝: 递归复制所有层级的对象
- 不可变对象: copy 返回自身（无需复制）
- __copy__ / __deepcopy__: 自定义拷贝行为

交互示意图: 用浏览器打开 images/copy_deepcopy.archify.html
"""

import copy


# ============================================================
# 1. 基础对比
# ============================================================

def demo_basics():
    """= vs copy vs deepcopy"""
    # 列表
    original = [[1, 2], [3, 4]]
    assigned = original
    shallow = copy.copy(original)
    deep = copy.deepcopy(original)

    # 修改内层
    original[0][0] = 99
    print(f"  original[0][0] = 99:")
    print(f"    assigned[0][0] = {assigned[0][0]}  (shared!)")
    print(f"    shallow[0][0]  = {shallow[0][0]}   (shared!)")
    print(f"    deep[0][0]     = {deep[0][0]}     (independent)")
    print(f"    original is assigned: {original is assigned}")
    print(f"    original is shallow:  {original is shallow}")
    print(f"    original is deep:     {original is deep}")


# ============================================================
# 2. 不可变对象
# ============================================================

def demo_immutable():
    """不可变对象的 copy 行为"""
    a = (1, 2, [3, 4])
    b = copy.copy(a)
    c = copy.deepcopy(a)

    print(f"  a = (1, 2, [3, 4])")
    print(f"  a is b (copy): {a is b}  (tuple copy returns self)")
    print(f"  a is c (deepcopy): {a is c}  (deepcopy creates new)")

    # 但内部可变对象仍共享
    a[2].append(5)
    print(f"  a[2].append(5):")
    print(f"    b[2] = {b[2]}  (shared inner list!)")
    print(f"    c[2] = {c[2]}  (independent)")


# ============================================================
# 3. 自定义 __copy__
# ============================================================

class Node:
    """链表节点，自定义浅拷贝"""
    def __init__(self, val, next_=None):
        self.val = val
        self.next = next_

    def __copy__(self):
        """浅拷贝: 只复制节点，共享 next 链"""
        return Node(self.val, self.next)

    def __repr__(self):
        vals = []
        node = self
        while node:
            vals.append(str(node.val))
            node = node.next
        return " -> ".join(vals) + " -> None"


# ============================================================
# 4. 循环引用
# ============================================================

def demo_cyclic():
    """deepcopy 正确处理循环引用"""
    a = [1, 2]
    a.append(a)  # 循环引用
    print(f"  a = [1, 2, a]  (cyclic)")
    print(f"  a[2] is a: {a[2] is a}")

    try:
        b = copy.deepcopy(a)
        print(f"  deepcopy(a): OK")
        print(f"  b[2] is b: {b[2] is b}  (cycle preserved)")
    except RecursionError as e:
        print(f"  deepcopy(a): RecursionError: {e}")


# ============================================================
# 5. Demo
# ============================================================

def run_demo():
    print("=" * 60)
    print("copy / deepcopy -- Demo Mode")
    print("=" * 60)

    # 1)
    print("\n[1] Assignment vs Copy vs Deepcopy:")
    demo_basics()

    # 2)
    print("\n[2] Immutable objects:")
    demo_immutable()

    # 3)
    print("\n[3] Custom __copy__ (Node):")
    n1 = Node(3)
    n2 = Node(2, n1)
    n3 = Node(1, n2)
    print(f"  Original: {n3}")
    n3_copy = copy.copy(n3)
    print(f"  Copy:     {n3_copy}")
    print(f"  n3 is n3_copy: {n3 is n3_copy}")
    print(f"  n3.next is n3_copy.next: {n3.next is n3_copy.next}  (shared!)")

    # 4)
    print("\n[4] Cyclic reference:")
    demo_cyclic()

    # 5)
    print("\n[5] Memory identity summary:")
    orig = [[1, 2], [3, 4]]
    print(f"  id(orig)          = {id(orig)}")
    print(f"  id(copy(orig))    = {id(copy.copy(orig))}")
    print(f"  id(deepcopy(orig))= {id(copy.deepcopy(orig))}")

    # 6) Rules
    print("\n[6] Decision guide:")
    print("  Use = (assignment): share the same object")
    print("  Use copy.copy():   new outer container, shared inner objects")
    print("  Use copy.deepcopy(): completely independent copy")
    print("  Rule: when in doubt, use deepcopy (slower but safe)")

    print(f"\n{'='*60}")


if __name__ == "__main__":
    # 只跑 demo; 交互示意图见 images/copy_deepcopy.archify.html
    run_demo()
