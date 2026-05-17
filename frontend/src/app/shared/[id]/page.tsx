"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useShareChat } from "@/hooks/useShareChat";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { CitationsDisplay } from "@/components/CitationsDisplay";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ChatTurn } from "@/app/c/[id]/page";

export default function SharedChatPage() {
  const params = useParams();
  const router = useRouter();
  const { loadSharedChat } = useShareChat();
  const [chat, setChat] = useState<{
    title: string;
    history: ChatTurn[];
    created_at: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChat = async () => {
      const data = await loadSharedChat(params.id as string);
      if (data) {
        setChat(data);
      }
      setLoading(false);
    };
    fetchChat();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">This shared chat is no longer available.</p>
        <Button onClick={() => router.push("/")}>Go Home</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Shared: {chat.title}</h1>
        </div>
        <p className="text-xs text-muted-foreground">
          Shared on {new Date(chat.created_at).toLocaleDateString()}
        </p>
      </header>

      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto p-6 space-y-6">
          {chat.history.map((turn, idx) => (
            <div
              key={idx}
              className={`flex ${turn.message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-3xl px-5 py-4 ${
                  turn.message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-foreground"
                }`}
              >
                {turn.message.role === "assistant" ? (
                  <MarkdownRenderer content={turn.message.content} />
                ) : (
                  <p className="leading-relaxed">{turn.message.content}</p>
                )}
                {turn.citations && <CitationsDisplay citations={turn.citations} />}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
