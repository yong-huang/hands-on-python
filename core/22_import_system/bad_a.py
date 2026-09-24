"""坏示例：模块顶部 import bad_b，bad_b 又 import bad_a → 部分初始化模块。"""
from bad_b import shout   # 此时 bad_a 还没定义 Loud，bad_b 回头 import bad_a 会拿半成品


class Loud:
    @staticmethod
    def speak():
        return "LOUD!" + shout()
