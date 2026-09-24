"""坏示例的另一侧：顶部 from bad_a import Loud 时 bad_a 尚未定义 Loud。"""
from bad_a import Loud


def shout():
    return " " + Loud.__name__
