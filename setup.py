from setuptools import setup, find_packages

setup(
    name="backend-bridge",
    version="1.1.0",
    packages=find_packages(),
    install_requires=["requests-toolbelt"],
    description="注册并代理转发后端服务",
)
