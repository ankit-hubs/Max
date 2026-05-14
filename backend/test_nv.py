import asyncio
from langchain_nvidia_ai_endpoints import ChatNVIDIA
import os

async def main():
    try:
        llm = ChatNVIDIA(model="meta/llama-3.1-405b-instruct", api_key="fake_key")
        res = await llm.ainvoke("hi")
        print(res)
    except Exception as e:
        print(e)

asyncio.run(main())
