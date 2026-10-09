Python 有三种方式实现多态。

Duck Typing、ABC、Protocol——你分得清吗？

---

Duck Typing：走起来像鸭子就是鸭子。

只关注对象有没有某个方法，不关注类型。

---

灵活，但缺方法只会在调用时炸出 AttributeError，接口约定全靠口头。

---

ABC 提供类型约束：@abstractmethod 强制子类实现接口。

把失败提前到实例化时。

---

register() 还能把第三方类纳入继承体系——不继承也能过 isinstance。

---

Protocol 结合两者优点：Duck Typing 的灵活性 + isinstance 检查。

---

一句话心智模型：三条路线共用同一个入口，区别只在「什么时候发现对象不合格」。

失败点越靠前，约束越强。

---

完整代码在 hands-on-python 仓库，python3 一跑就有体感。

链接在评论区，下期见。
