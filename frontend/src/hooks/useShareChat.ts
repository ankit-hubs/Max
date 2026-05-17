"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

export function useShareChat() {
  const supabase = createClient();
  const [sharedLink, setSharedLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const shareChat = async (chatId: string) => {
    setLoading(true);
    const shareId = crypto.randomUUID();

    const { error } = await supabase
      .from("chats")
      .update({ shared_link: shareId })
      .eq("id", chatId);

    if (!error) {
      const url = `${window.location.origin}/shared/${shareId}`;
      setSharedLink(url);
      await navigator.clipboard.writeText(url);
    }

    setLoading(false);
    return sharedLink;
  };

  const loadSharedChat = async (shareId: string) => {
    const { data, error } = await supabase
      .from("chats")
      .select("history, title, created_at")
      .eq("shared_link", shareId)
      .single();

    if (error) return null;
    return data;
  };

  const unshareChat = async (chatId: string) => {
    await supabase.from("chats").update({ shared_link: null }).eq("id", chatId);
    setSharedLink(null);
  };

  return { sharedLink, loading, shareChat, loadSharedChat, unshareChat };
}
