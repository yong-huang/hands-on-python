#!/usr/bin/env bash
# =============================================================================
# setup_env.sh —— 公共环境脚本：安装实验系列唯一的第三方依赖 matplotlib
# 幂等可重复执行; 国内网络优先走镜像源, 失败回退官方 PyPI。
# 用法: bash scripts/setup_env.sh   (在任意 cwd 运行均可)
# =============================================================================
set -euo pipefail

MIRRORS=(
    "https://pypi.tuna.tsinghua.edu.cn/simple"
    "https://mirrors.aliyun.com/pypi/simple"
)

echo "=====> [1] 检测 Python 版本"
python3 --version

echo "=====> [2] 检查 matplotlib 是否已安装"
if python3 -c "import matplotlib" 2>/dev/null; then
    echo "  matplotlib 已安装: $(python3 -c 'import matplotlib; print(matplotlib.__version__)')"
    echo "  无需操作, 退出。"
    exit 0
fi
echo "  matplotlib 未安装, 开始安装..."

echo "=====> [3] 安装 matplotlib (优先国内镜像源)"
for mirror in "${MIRRORS[@]}"; do
    echo "  尝试镜像源: ${mirror}"
    if python3 -m pip install -i "${mirror}" matplotlib; then
        echo "  安装成功 (via ${mirror})"
        exit 0
    fi
    echo "  镜像源失败, 尝试下一个..."
done

echo "=====> [4] 回退官方 PyPI"
python3 -m pip install matplotlib
echo "  安装成功 (via官方源)"

echo "=====> [5] 验证"
python3 -c "import matplotlib; print('matplotlib', matplotlib.__version__, 'ready')"
