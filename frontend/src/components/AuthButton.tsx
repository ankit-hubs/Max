"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";

export function AuthButton() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleSignIn = () => {
    router.push("/login");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (user) {
    return (
      <Button variant="outline" size="sm" onClick={handleSignOut} className="text-xs">
        Sign Out
      </Button>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={handleSignIn} className="text-xs">
      Sign In
    </Button>
  );
}
