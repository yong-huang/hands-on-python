"""被导入的示例模块：模块级代码只在"第一次被 import"时执行一次。"""

print("  [counter_mod] 模块体执行（每次进程只应出现一次）")

LOADED_AT_IMPORT = "import 阶段初始化的值"


def get_name():
    return "counter_mod"
