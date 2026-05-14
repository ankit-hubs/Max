from supabase import create_client, Client
from core.config import settings

def get_supabase_client() -> Client | None:
    if not settings.supabase_url or not settings.supabase_key:
        print("Warning: Supabase credentials not found. Supabase operations will be skipped.")
        return None
    return create_client(settings.supabase_url, settings.supabase_key)
