import asyncio
from langchain_nvidia_ai_endpoints import ChatNVIDIA
import os

models_to_test = [
    "nvidia/llama-3.1-nemotron-70b-instruct",
    "mistralai/mistral-large-2-instruct",
    "meta/llama-3.3-70b-instruct",
    "meta/llama-3.1-70b-instruct"
]

async def main():
    for model in models_to_test:
        try:
            print(f"Testing {model}...")
            llm = ChatNVIDIA(model=model, api_key="fake_key")
            res = await llm.ainvoke("hi")
            print(f"Success for {model}")
        except Exception as e:
            print(f"Failed for {model}: {e}")

asyncio.run(main())
