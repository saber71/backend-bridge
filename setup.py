import json
import os

from setuptools import setup, find_packages

# 获取当前目录
current_directory = os.getcwd()

# 构建文件路径
file_path = os.path.join(current_directory, "package.json")

# 读取JSON文件
with open(file_path, "r", encoding="utf-8") as file:
    packageJson = json.load(file)

setup(
    name="backend-bridge",
    version=packageJson["version"],
    packages=find_packages(),
    install_requires=["requests-toolbelt"],
    description="注册并代理转发后端服务",
)
