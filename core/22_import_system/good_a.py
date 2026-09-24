"""修好的版本：把 import 挪进函数体，调用时两个模块都已初始化完毕。"""


class Loud:
    @staticmethod
    def speak():
        from good_b import shout   # 延迟导入：调用时才解析，绕开初始化顺序
        return "LOUD!" + shout()
