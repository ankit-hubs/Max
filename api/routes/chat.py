import asyncio
import re
import json
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any, AsyncGenerator
from langchain_nvidia_ai_endpoints import ChatNVIDIA
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from core.config import settings
from core.search import search_web
from core.prompts import build_system_prompt

SEARCH_TRIGGERS = re.compile(
    r'\b(?:search|find|lookup|look ?up|current|latest|recent|news|update|google|browse|check online)\b',
    re.IGNORECASE
)

TEXT_MODEL = "mistralai/mistral-small-4-119b-2603"
VISION_MODEL = "meta/llama-3.2-11b-vision-instruct"

router = APIRouter()

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    focus_mode: Optional[str] = "Default"
    file_data: Optional[str] = None
    file_type: Optional[str] = None
    stream: Optional[bool] = False

class ChatResponse(BaseModel):
    response: str
    citations: List[Dict[str, Any]]
    confidence_score: Optional[int] = None

def calculate_confidence_score(citations: List[Dict[str, Any]]) -> int:
    if not citations:
        return 0
    score = min(50 + (len(citations) * 10), 98)
    return score

async def invoke_model(model_name: str, messages: list) -> str:
    try:
        llm = ChatNVIDIA(
            model=model_name,
            api_key=settings.nvidia_api_key,
            temperature=0.2,
            max_tokens=1024,
        )
        response = await llm.ainvoke(messages)
        return response.content
    except Exception as e:
        return f"Error from {model_name}: {str(e)}"

async def invoke_model_stream(model_name: str, messages: list) -> AsyncGenerator[str, None]:
    try:
        llm = ChatNVIDIA(
            model=model_name,
            api_key=settings.nvidia_api_key,
            temperature=0.2,
            max_tokens=1024,
        )
        async for chunk in llm.astream(messages):
            if hasattr(chunk, 'content') and chunk.content:
                yield chunk.content
    except Exception as e:
        yield f"Error: {str(e)}"

async def needs_web_search(query: str, focus_mode: str) -> bool:
    if focus_mode == "Internal":
        return False
    if focus_mode in ("News", "Academic", "Deep Research"):
        return True
    if not settings.nvidia_api_key or settings.nvidia_api_key == "your_nvidia_nim_api_key":
        return True

    if SEARCH_TRIGGERS.search(query):
        return True

    llm = ChatNVIDIA(
        model=TEXT_MODEL,
        api_key=settings.nvidia_api_key,
        temperature=0.1,
        max_tokens=10,
    )
    prompt = (
        "Can you answer this from your training knowledge alone, "
        "or do you need a web search for current/up-to-date information?\n"
        "Reply with exactly one word: KNOW or SEARCH.\n\n"
        f"Query: {query}"
    )
    try:
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        return "SEARCH" in response.content.strip().upper()
    except Exception:
        return True

@router.post("", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest, background_tasks: BackgroundTasks):
    if not request.messages:
        raise HTTPException(status_code=400, detail="Messages list cannot be empty")

    latest_message = request.messages[-1].content
    focus_mode = request.focus_mode or "Default"

    citations = []
    search_context = ""
    should_search = await needs_web_search(latest_message, focus_mode)

    if should_search:
        results = search_web(query=latest_message, focus_mode=focus_mode)
        if results:
            citations = [{"title": r.get("title"), "url": r.get("url")} for r in results]
            context_parts = []
            for r in results:
                content = re.sub(r'https?://\S+', '', r.get('content', ''))
                content = re.sub(r'\s+', ' ', content).strip()
                context_parts.append(f"{r.get('title')}: {content}")
            search_context = "Web Search Results:\n" + "\n".join(context_parts)

    confidence_score = calculate_confidence_score(citations) if should_search else 100

    if not settings.nvidia_api_key or settings.nvidia_api_key == "your_nvidia_nim_api_key":
        mock_resp = f"**[MOCK {focus_mode}]** I received your message: '{latest_message}'.\n\n"
        if should_search:
            mock_resp += f"I found {len(citations)} web search results." if citations else "No search results found."
        else:
            mock_resp += "I determined web search was not needed for this query."
        mock_resp += "\n\nTo enable real AI inference, please configure the `NVIDIA_API_KEY` in the backend `.env` file."
        return ChatResponse(
            response=mock_resp,
            citations=citations,
            confidence_score=confidence_score
        )

    lc_messages = []
    system_prompt = build_system_prompt(focus_mode, search_context)
    lc_messages.append(SystemMessage(content=system_prompt))

    file_context = ""
    if request.file_data and request.file_type:
        if request.file_type.startswith("image/"):
            file_context = f"\n\n[User attached an image ({request.file_type})]"
        elif request.file_type.startswith("video/"):
            file_context = f"\n\n[User attached a video ({request.file_type})]"
        else:
            file_context = f"\n\n[User attached a file ({request.file_type})]"

    for i, msg in enumerate(request.messages):
        if msg.role == "user":
            content = msg.content
            if i == len(request.messages) - 1 and request.file_data:
                content += file_context
                if request.file_type.startswith("image/"):
                    content_parts = [
                        {"type": "text", "text": msg.content},
                        {"type": "image_url", "image_url": {"url": f"data:{request.file_type};base64,{request.file_data}"}}
                    ]
                    lc_messages.append(HumanMessage(content=content_parts))
                else:
                    lc_messages.append(HumanMessage(content=content))
            else:
                lc_messages.append(HumanMessage(content=content))
        elif msg.role == "assistant":
            lc_messages.append(AIMessage(content=msg.content))

    has_image = request.file_data and request.file_type and request.file_type.startswith("image/")
    model_name = VISION_MODEL if has_image else TEXT_MODEL

    final_response = await invoke_model(model_name, lc_messages)

    return ChatResponse(
        response=final_response,
        citations=citations,
        confidence_score=confidence_score
    )

@router.post("/stream")
async def chat_stream_endpoint(request: ChatRequest):
    if not request.messages:
        raise HTTPException(status_code=400, detail="Messages list cannot be empty")

    latest_message = request.messages[-1].content
    focus_mode = request.focus_mode or "Default"

    citations = []
    search_context = ""
    should_search = await needs_web_search(latest_message, focus_mode)

    if should_search:
        results = search_web(query=latest_message, focus_mode=focus_mode)
        if results:
            citations = [{"title": r.get("title"), "url": r.get("url")} for r in results]
            context_parts = []
            for r in results:
                content = re.sub(r'https?://\S+', '', r.get('content', ''))
                content = re.sub(r'\s+', ' ', content).strip()
                context_parts.append(f"{r.get('title')}: {content}")
            search_context = "Web Search Results:\n" + "\n".join(context_parts)

    confidence_score = calculate_confidence_score(citations) if should_search else 100

    async def stream_generator():
        yield json.dumps({"type": "citations", "data": {"citations": citations, "confidence_score": confidence_score}}) + "\n"

        if not settings.nvidia_api_key or settings.nvidia_api_key == "your_nvidia_nim_api_key":
            mock_resp = f"**[MOCK {focus_mode}]** I received your message: '{latest_message}'.\n\n"
            if should_search:
                mock_resp += f"I found {len(citations)} web search results." if citations else "No search results found."
            else:
                mock_resp += "I determined web search was not needed for this query."
            yield json.dumps({"type": "token", "data": mock_resp}) + "\n"
            yield json.dumps({"type": "complete", "data": {}}) + "\n"
            return

        lc_messages = []
        system_prompt = build_system_prompt(focus_mode, search_context)
        lc_messages.append(SystemMessage(content=system_prompt))

        file_context = ""
        if request.file_data and request.file_type:
            if request.file_type.startswith("image/"):
                file_context = f"\n\n[User attached an image ({request.file_type})]"
            elif request.file_type.startswith("video/"):
                file_context = f"\n\n[User attached a video ({request.file_type})]"
            else:
                file_context = f"\n\n[User attached a file ({request.file_type})]"

        for i, msg in enumerate(request.messages):
            if msg.role == "user":
                content = msg.content
                if i == len(request.messages) - 1 and request.file_data:
                    content += file_context
                    if request.file_type.startswith("image/"):
                        content_parts = [
                            {"type": "text", "text": msg.content},
                            {"type": "image_url", "image_url": {"url": f"data:{request.file_type};base64,{request.file_data}"}}
                        ]
                        lc_messages.append(HumanMessage(content=content_parts))
                    else:
                        lc_messages.append(HumanMessage(content=content))
                else:
                    lc_messages.append(HumanMessage(content=content))
            elif msg.role == "assistant":
                lc_messages.append(AIMessage(content=msg.content))

        has_image = request.file_data and request.file_type and request.file_type.startswith("image/")
        model_name = VISION_MODEL if has_image else TEXT_MODEL

        async for token in invoke_model_stream(model_name, lc_messages):
            yield json.dumps({"type": "token", "data": token}) + "\n"

        yield json.dumps({"type": "complete", "data": {}}) + "\n"

    return StreamingResponse(stream_generator(), media_type="application/x-ndjson")
