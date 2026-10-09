今天讲 Python 元类。

type 是什么、单例怎么拦、ORM 字段怎么自动收集，一次拆完。

---

普通函数，调用时才执行。

class 语句反过来——定义那一刻，类对象就已经创建好了。

---

那这个「创建类」的动作，是谁在干活？

---

答案是 type。

想让一批类自动获得能力，就把 type 换成你自己的。

---

心智模型一句话：class Foo 不是声明，是表达式。

Python 在背后调 type("Foo", bases, namespace)，类就诞生了。

---

展开给你看。

class Dog(Animal): species = "Canine"，等价于

Dog = type("Dog", (Animal,), {"species": "Canine"})。

---

真机：Dog.species 是 Canine。

type(Dog) 是 type；type(type) 还是 type。

---

往下挖一层：type(42) 是 int，type(int) 是 type。

类的链条，最后都落在 type 上。

---

再狠一点：isinstance(int, type) 是 True。

type 是所有类的类，也是它自己的实例。

---

元类能干什么？第一件：给一批类自动加方法。

比如自动 __str__。

---

真机：Person 打印出完整字段，自动注入成功。

---

但注意这条输出：custom str，metaclass skipped。

类自己定义了 __str__，元类就跳过。

---

批量注入必须尊重已有定义——不然会悄悄覆盖用户的实现。

---

第二件：单例。

需求：一个类，全局只有一个实例。

---

代码：SingletonMeta，一个类级字典 _instances，加一个 __call__。

---

为什么拦 __call__？

ClassName() 这种写法，触发的就是元类的 __call__——实例创建的必经之路。

---

首次调用，真正创建实例存进字典。

之后每次调用，直接返回缓存。

---

真机：db1 is db2，True。

---

小陷阱：第二次 Database("remotehost") 的参数被忽略了。

首次创建胜出，这是单例的预期行为。

---

第三件，也是最实用的：ORM 字段映射。

需求：类里声明 Field，表结构自动生成。

---

代码：OrmMeta 的 __new__，扫描 namespace。

把所有 Field 收进 cls._fields，表名取 name.lower()。

---

注意这里拦的是 __new__。

它管「类怎么创建」；单例的 __call__ 管「实例怎么创建」。时机不同。

---

真机：User._table 是 user，_fields 是 id、name、email。

---

SQL 直接生成：CREATE TABLE、SELECT、INSERT，全从这两个类属性拼出来。

---

用户类里，一行样板都没有。

这就是「类创建之前拦截」的价值。

---

不过，不是所有需求都配动用元类。

---

只是注册一下子类？Python 3.6+ 有轻量版：__init_subclass__。

---

真机：Event 基类下面，click、key 两个子类自动注册，handler 表自动建好。

---

原则一句话：能用 __init_subclass__，就不用元类。

---

回收一下三层：__new__ 创建类，__call__ 管实例，__init_subclass__ 管子类钩子。

---

这也是这个系列的第五块拼图。

装饰器管函数增强，with 管资源，描述符管属性，生成器管遍历，元类管类的诞生。

---

ORM 的字段映射、框架的单例、插件自动注册，底层全是这套。

---

完整代码在 hands-on-python 仓库。

零依赖，python3 一跑就有体感。

链接在评论区，下期见。
