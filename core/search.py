from tavily import TavilyClient
from core.config import settings

def search_web(query: str, depth: str = "advanced", focus_mode: str = "Default"):
    if not settings.tavily_api_key or settings.tavily_api_key == "your_tavily_api_key":
        print("Warning: Tavily API key not found. Returning empty search results.")
        return []
    
    try:
        client = TavilyClient(api_key=settings.tavily_api_key)
        
        # Configure search parameters based on Focus Mode
        search_topic = "general"
        search_query = query
        
        if focus_mode == "News":
            search_topic = "news"
        elif focus_mode == "Academic":
            # Append keywords to bias towards scholarly articles
            search_query = query + " scholarly academic peer-reviewed"
        elif focus_mode == "Deep Research":
            # Deep research might use more depth/max_results
            pass 
            
        response = client.search(
            query=search_query, 
            search_depth=depth, 
            topic=search_topic,
            max_results=5 if focus_mode != "Deep Research" else 10
        )
        return response.get("results", [])
    except Exception as e:
        print(f"Tavily search error: {e}")
        return []
