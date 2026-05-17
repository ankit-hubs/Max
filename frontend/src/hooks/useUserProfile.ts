"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export function useUserProfile() {
  const supabase = createClient();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProfile = async () => {
    setLoading(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      setProfile({
        id: session.user.id,
        email: session.user.email || "",
        name: session.user.user_metadata?.name || null,
        avatar_url: session.user.user_metadata?.avatar_url || null,
        created_at: session.user.created_at,
      });
    }
    setLoading(false);
  };

  const updateProfile = async (updates: { name?: string }) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { error } = await supabase.auth.updateUser({
      data: { name: updates.name },
    });

    if (!error) {
      fetchProfile();
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return { profile, loading, fetchProfile, updateProfile, signOut };
}
