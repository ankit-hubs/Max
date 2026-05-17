"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Brain, Zap, Shield, Paperclip, ArrowUp, ChevronDown, Check, Mic, MicOff, MessageSquare, Trash2, BookmarkCheck } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AuthButton } from "@/components/AuthButton";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { createClient } from "@/utils/supabase/client";

const FOCUS_MODES = ["Default", "Academic", "News", "Internal", "Deep Research"];

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focusMode, setFocusMode] = useState("Default");
  const [fileName, setFileName] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [chatList, setChatList] = useState<{ id: string; title: string; updated_at: string; is_bookmarked: boolean }[]>([]);
  const [filteredChatList, setFilteredChatList] = useState<typeof chatList>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isListening, transcript, isSupported, startListening, stopListening, resetTranscript } = useVoiceInput();
  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchChats(session.user.id);
      }
    };
    fetchUser();
  }, [supabase.auth]);

  useEffect(() => {
    if (transcript) {
      setQuery(transcript);
    }
  }, [transcript]);

  const fetchChats = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("chats")
      .select("id, title, updated_at, is_bookmarked")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (data) {
      setChatList(data);
      setFilteredChatList(data);
    }
  }, [supabase]);

  const handleSearchChats = (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setFilteredChatList(chatList);
    } else {
      setFilteredChatList(
        chatList.filter(c =>
          (c.title || "").toLowerCase().includes(q.toLowerCase())
        )
      );
    }
  };

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("chats").delete().eq("id", chatId);
    setChatList(prev => prev.filter(c => c.id !== chatId));
    setFilteredChatList(prev => prev.filter(c => c.id !== chatId));
  };

  const handleSelectChat = (chatId: string) => {
    router.push(`/c/${chatId}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    if (!user) {
      router.push(`/login?redirect=/&q=${encodeURIComponent(query)}&mode=${encodeURIComponent(focusMode)}`);
      return;
    }

    const chatId = crypto.randomUUID();
    const params = new URLSearchParams();
    params.set("q", query);
    params.set("mode", focusMode);

    router.push(`/c/${chatId}?${params.toString()}`);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
    }
    e.target.value = "";
  };

  const toggleVoice = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="absolute top-0 right-0 p-4 z-10 w-full flex justify-end items-center gap-2">
        <ThemeToggle />
        <AuthButton />
      </header>
      <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 md:p-24 w-full max-w-5xl mx-auto space-y-16">
        <section className="w-full flex flex-col items-center text-center space-y-8 mt-12">
          <div className="space-y-4">
            <h1 className="text-5xl sm:text-7xl font-semibold tracking-tighter">
              Meet Kai.
            </h1>
            <p className="text-xl sm:text-2xl text-muted-foreground font-medium max-w-2xl mx-auto tracking-tight">
              Accuracy Above All.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="w-full max-w-3xl relative group">
            <div className="relative flex flex-col w-full shadow-sm rounded-[2rem] bg-background border border-input focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent transition-all p-1.5 pb-3">
              <div className="flex items-center w-full">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,.pdf,.doc,.docx,.txt,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  className="ml-2 text-muted-foreground hover:bg-transparent"
                >
                  <Paperclip className="h-5 w-5" />
                </Button>

                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask anything..."
                  className="w-full px-4 py-7 text-lg border-none shadow-none focus-visible:ring-0 bg-transparent"
                  autoFocus
                />

                {isSupported && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={toggleVoice}
                    className={cn(
                      "mr-2 text-muted-foreground hover:bg-transparent",
                      isListening && "text-red-500 animate-pulse"
                    )}
                  >
                    {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </Button>
                )}
              </div>
              {fileName && (
                <div className="px-4 text-xs text-muted-foreground flex items-center gap-2 mt-1">
                  <Paperclip className="h-3 w-3" />
                  <span className="truncate max-w-[200px]">{fileName}</span>
                </div>
              )}
              {isListening && (
                <div className="px-4 text-xs text-red-500 flex items-center gap-2 mt-1 animate-pulse">
                  <Mic className="h-3 w-3" />
                  <span>Listening...</span>
                </div>
              )}

              <div className="flex items-center justify-between px-4 mt-2">
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-full h-8 text-xs font-medium bg-muted/50 border-none")}>
                      {focusMode} <ChevronDown className="ml-1 h-3 w-3 text-muted-foreground" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      {FOCUS_MODES.map((mode) => (
                        <DropdownMenuItem
                          key={mode}
                          onClick={() => setFocusMode(mode)}
                          className="flex items-center justify-between cursor-pointer"
                        >
                          {mode}
                          {focusMode === mode && <Check className="h-4 w-4 text-primary" />}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <Button
                  type="submit"
                  size="icon"
                  disabled={!query.trim()}
                  className={`h-10 w-10 rounded-full transition-colors ${query.trim() ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  <ArrowUp className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </form>
        </section>

        <section className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
          <Card className="border-none shadow-none bg-muted/30">
            <CardHeader>
              <Zap className="h-8 w-8 mb-4 text-primary" />
              <CardTitle>Powered by modern multillm</CardTitle>
              <CardDescription>
                Ultra-low latency inference routing your query to the best open-weight LLMs dynamically.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-none shadow-none bg-muted/30">
            <CardHeader>
              <Shield className="h-8 w-8 mb-4 text-primary" />
              <CardTitle>Grounded in Real-Time</CardTitle>
              <CardDescription>
                Every factual claim is backed by real-time web search and verifiable citations.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-none shadow-none bg-muted/30">
            <CardHeader>
              <Brain className="h-8 w-8 mb-4 text-primary" />
              <CardTitle>Secured by Supabase</CardTitle>
              <CardDescription>
                Enterprise-grade PostgreSQL with pgvector for advanced semantic memory.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>

        {user && chatList.length > 0 && (
          <section className="w-full max-w-3xl space-y-4 pb-12">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent Chats</h2>
              <Input
                value={searchQuery}
                onChange={(e) => handleSearchChats(e.target.value)}
                placeholder="Search chats..."
                className="w-64 h-8 text-sm"
              />
            </div>
            <ScrollArea className="h-64 rounded-lg border bg-muted/20">
              <div className="p-2 space-y-1">
                {filteredChatList.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">No chats found</p>
                )}
                {filteredChatList.map(chat => (
                  <div
                    key={chat.id}
                    onClick={() => handleSelectChat(chat.id)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer text-sm hover:bg-muted transition-colors group"
                  >
                    {chat.is_bookmarked ? (
                      <BookmarkCheck className="h-4 w-4 flex-shrink-0 text-yellow-500" />
                    ) : (
                      <MessageSquare className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate flex-1">{chat.title || "Untitled"}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {new Date(chat.updated_at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={(e) => handleDeleteChat(chat.id, e)}
                      className="h-6 w-6 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </section>
        )}
      </main>
    </div>
  );
}
