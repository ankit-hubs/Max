"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

export interface UsageStats {
  date: string;
  total_queries: number;
  total_tokens: number;
  total_searches: number;
}

export function useUsageStats() {
  const supabase = createClient();
  const [stats, setStats] = useState<UsageStats[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStats = async (days = 30) => {
    setLoading(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      setLoading(false);
      return;
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const { data } = await supabase
      .from("usage_stats")
      .select("*")
      .eq("user_id", session.user.id)
      .gte("date", cutoff.toISOString().split("T")[0])
      .order("date", { ascending: true });

    if (data) setStats(data);
    setLoading(false);
  };

  const incrementStat = async (
    field: "total_queries" | "total_tokens" | "total_searches",
    amount = 1
  ) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return;

    const today = new Date().toISOString().split("T")[0];

    const { data: existing } = await supabase
      .from("usage_stats")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("date", today)
      .single();

    if (existing) {
      await supabase
        .from("usage_stats")
        .update({ [field]: ((existing as any)[field] || 0) + amount, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase.from("usage_stats").insert({
        user_id: session.user.id,
        date: today,
        [field]: amount,
      });
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return { stats, loading, fetchStats, incrementStat };
}
