Python 起 4 个线程，CPU 能跑满吗？

---

答案是不能。CPython 有一把全局解释器锁——GIL。

同一时刻，只允许一个线程执行字节码。

---

一句话心智模型：GIL 只锁「执行字节码」这件事。

线程一进入 I/O 等待，就把锁让出去。

---

线程 1 发起 socket.recv()，阻塞等待——等待期间释放 GIL。

线程 2 获得锁执行 5 毫秒，I/O 完成后线程 1 重新竞争。

---

这就是「多线程能加速 I/O、不能加速 CPU」的微观原因。

---

口说无凭，真机跑基准。

CPU 密集：素数计数，n 等于二十万，4 个进程。

---

serial 0.353 秒，threading 0.359 秒。

比值 1.02——GIL 串行化，不加速。

---

multiprocessing 0.164 秒，比值 0.46——真并行加速。

每进程一把独立 GIL，字节码真并行。

---

但也有坑：任务缩到 n=5000，进程池启动成本远超计算本体，多进程比串行倒挂 17 倍。

粒度，也是选型的一部分。

---

换 I/O 密集：8 个 100 毫秒的 sleep。

serial 0.828 秒，threading 0.106 秒——7.84 倍加速。

---

asyncio 0.101 秒——8.19 倍。

两个都比串行快，因为 GIL 在 I/O 等待期间被释放了。

---

那什么时候释放 GIL？

time.sleep() 可以，socket.recv() 可以，numpy.sum() 也可以。

---

for 循环十亿次，不行。str.join()，不行。re.match()，也不行。

---

注意，「是 C 扩展」不等于「释放 GIL」。

re 和 json 就是 C 写的，但它们直接操作 Python 对象，GIL 不放。

numpy 能释放，是因为它在 C 层显式调了 Py_BEGIN_ALLOW_THREADS。

---

所以选型边界很清楚。

threading：I/O 密集，网络、文件、数据库。

multiprocessing：CPU 密集，计算、编码。

asyncio：大量 I/O 并发，高 QPS API。

---

为什么不直接去掉 GIL？

它保护 CPython 的引用计数。3.13 起有 free-threading 实验版，但传统 GIL 仍是默认。

---

完整代码在 hands-on-python 仓库，python3 一跑就有体感。

链接在评论区，下期见。
