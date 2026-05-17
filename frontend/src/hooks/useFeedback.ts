"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

export function useFeedback() {
  const supabase = createClient();
  const [feedback, setFeedback] = useState<Record<string, "up" | "down">>({});

  const submitFeedback = async (
    chatId: string,
    messageIndex: number,
    rating: "up" | "down",
    comment?: string
  ) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return;

    const key = `${chatId}-${messageIndex}`;

    const { error } = await supabase.from("feedback").upsert(
      {
        user_id: session.user.id,
        chat_id: chatId,
        message_index: messageIndex,
        rating,
        comment,
      },
      { onConflict: "user_id,chat_id,message_index" }
    );

    if (!error) {
      setFeedback((prev) => ({ ...prev, [key]: rating }));
    }
  };

  const loadFeedback = async (chatId: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data } = await supabase
      .from("feedback")
      .select("message_index, rating")
      .eq("chat_id", chatId)
      .eq("user_id", session.user.id);

    if (data) {
      const map: Record<string, "up" | "down"> = {};
      data.forEach((f) => {
        map[`${chatId}-${f.message_index}`] = f.rating as "up" | "down";
      });
      setFeedback(map);
    }
  };

  return { feedback, submitFeedback, loadFeedback };
}
