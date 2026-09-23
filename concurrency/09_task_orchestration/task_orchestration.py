"""
09 · 任务编排 —— TaskGroup 结构化并发 / wait_for 超时 / gather 收集策略
并发清单项目 9：把"同时跑"管理得井井有条——一个失败全取消、超时兜底、收齐结果

三个实测点（全部可断言）:
- TaskGroup:   一个任务抛异常 → 其余任务被自动取消，总耗时远小于最长任务
- wait_for:    超时抛 TimeoutError，且子协程的 finally 清理代码确实执行过
- gather:      return_exceptions=True 收齐全部结果（含异常对象）；不加则首败即抛

用法: python3 task_orchestration.py   # 全部实测 + 断言，约 1 秒
"""

import asyncio
import sys
import time


def section(title: str) -> None:
    print(f"\n{'=' * 56}\n[{title}]\n{'=' * 56}")


# ============================================================
# 1. TaskGroup：一个失败，全员取消（结构化并发）
# ============================================================

cleanup_ran = False


async def fast_ok() -> str:
    await asyncio.sleep(0.05)
    return "fast-ok"


async def slow_task() -> str:
    global cleanup_ran
    try:
        await asyncio.sleep(1.0)            # 最长任务：1 秒
        return "slow-done"
    finally:
        cleanup_ran = True                  # 被取消时 finally 也要执行


async def bomber() -> str:
    await asyncio.sleep(0.1)
    raise RuntimeError("任务 3 爆炸了")


async def tg_main() -> list:
    async with asyncio.TaskGroup() as tg:   # 3.11+
        tg.create_task(fast_ok())
        tg.create_task(slow_task())
        tg.create_task(bomber())            # 它在 0.1s 时引爆
    return ["never"]                        # 异常发生时走不到这里


def demo_taskgroup() -> None:
    section("1. TaskGroup：一个失败，全员自动取消")
    t0 = time.perf_counter()
    try:
        asyncio.run(tg_main())
        raise AssertionError("应该有异常冒出来")
    except ExceptionGroup as eg:            # 3.11+: 子异常打包成 ExceptionGroup
        errors = [e for e in eg.exceptions]
        assert any(isinstance(e, RuntimeError) for e in errors), f"应含 RuntimeError: {errors}"
    elapsed = time.perf_counter() - t0
    assert elapsed < 0.5, f"总耗时 {elapsed:.2f}s，说明慢任务没被取消"
    assert cleanup_ran, "慢任务的 finally 没有执行（取消时必须清理）"
    print(f"  三个任务：0.05s 成功 / 1.0s 慢任务 / 0.1s 引爆")
    print(f"  引爆后总耗时 {elapsed * 1000:.0f}ms（远小于慢任务的 1000ms）→ 慢任务被自动取消")
    print(f"  慢任务的 finally 清理已执行 ✓  异常打包为 ExceptionGroup 上抛")
    print("  结构化并发：async with 块结束时，要么全成、要么全停——没有孤儿任务")


# ============================================================
# 2. wait_for：超时兜底 + 取消清理
# ============================================================

async def stubborn() -> str:
    global cleanup_ran
    try:
        await asyncio.sleep(1.0)
        return "不可能返回"
    finally:
        cleanup_ran = True


def demo_wait_for() -> None:
    global cleanup_ran
    section("2. wait_for：0.2s 超时，子协程被取消但清理了")
    cleanup_ran = False

    async def main() -> None:
        try:
            await asyncio.wait_for(stubborn(), timeout=0.2)
            raise AssertionError("应该超时")
        except TimeoutError:                # 3.11+ 直接 TimeoutError
            pass

    t0 = time.perf_counter()
    asyncio.run(main())
    elapsed = time.perf_counter() - t0
    assert elapsed < 0.5, f"超时未生效: {elapsed:.2f}s"
    assert cleanup_ran, "超时取消后 finally 没执行"
    print(f"  0.2s 准时抛 TimeoutError（实测 {elapsed * 1000:.0f}ms）")
    print(f"  stubborn() 的 finally 清理已执行 ✓ —— 取消不是消失，是温和地善后")
    print("  3.11+ 新写法：async with asyncio.timeout(0.2): ...（语义相同）")


# ============================================================
# 3. gather：return_exceptions 的两种收集策略
# ============================================================

async def value(v: str) -> str:
    await asyncio.sleep(0.03)
    return v


async def failure() -> str:
    await asyncio.sleep(0.02)
    raise ValueError("gather-内错误")


async def gather_soft() -> list:
    return await asyncio.gather(
        value("A"), failure(), value("B"),
        return_exceptions=True,             # 失败也当结果收
    )


async def gather_hard() -> list:
    return await asyncio.gather(value("A"), failure(), value("B"))


def demo_gather() -> None:
    section("3. gather：return_exceptions 的两种策略")
    soft = asyncio.run(gather_soft())
    assert len(soft) == 3, f"应收齐 3 个结果，实际 {len(soft)}"
    assert soft[0] == "A" and soft[2] == "B" and isinstance(soft[1], ValueError)
    print(f"  return_exceptions=True: {soft!r}")
    print("  → 3 个结果收齐：1 个异常对象 + 2 个正常值，失败不拖累别人")

    try:
        asyncio.run(gather_hard())
        raise AssertionError("应该抛 ValueError")
    except ValueError as e:
        print(f"  return_exceptions=False: 首败即抛 ValueError({e})——后面的结果不要了")
    print("  选型：要'尽力收齐'用 True（批量校验）；要'一票否决'用默认 False")


def main() -> None:
    print(f"Python {sys.version.split()[0]}")
    demo_taskgroup()
    demo_wait_for()
    demo_gather()
    print(f"\n{'=' * 56}")
    print("全部断言通过 ✓  验收点：TaskGroup 自动取消（§1）、超时清理（§2）、gather 双策略（§3）")


if __name__ == "__main__":
    main()
