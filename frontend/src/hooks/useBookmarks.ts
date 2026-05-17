"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

export function useBookmarks() {
  const supabase = createClient();
  const [bookmarkedChats, setBookmarkedChats] = useState<
    { id: string; title: string; updated_at: string }[]
  >([]);

  const fetchBookmarks = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data } = await supabase
      .from("chats")
      .select("id, title, updated_at")
      .eq("user_id", session.user.id)
      .eq("is_bookmarked", true)
      .order("updated_at", { ascending: false });

    if (data) setBookmarkedChats(data);
  };

  const toggleBookmark = async (chatId: string, currentBookmarkState: boolean) => {
    const { error } = await supabase
      .from("chats")
      .update({ is_bookmarked: !currentBookmarkState })
      .eq("id", chatId);

    if (!error) {
      fetchBookmarks();
    }
  };

  useEffect(() => {
    fetchBookmarks();
  }, []);

  return { bookmarkedChats, toggleBookmark, fetchBookmarks };
}
