"use client";

import { Suspense, useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import { Menu, X, Shield, Paperclip, ArrowUp, Link as LinkIcon, RotateCcw, ChevronDown, Check, MessageSquare, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";

const FOCUS_MODES = ["Default", "Academic", "News", "Internal", "Deep Research"];

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Citation = {
  title: string;
  url: string;
};

type ChatTurn = {
  message: Message;
  citations?: Citation[];
  confidenceScore?: number;
  isLoading?: boolean;
};

function ChatComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const supabase = createClient();
  
  const initialQuery = searchParams.get("q");
  const initialMode = searchParams.get("mode") || "Default";

  const [query, setQuery] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatTurn[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [focusMode, setFocusMode] = useState(initialMode);
  const [initialized, setInitialized] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatList, setChatList] = useState<{ id: string; title: string; updated_at: string }[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    fetchUser();
  }, [supabase.auth]);

  // Handle initial load with search params or fetch from DB
  useEffect(() => {
    const initChat = async () => {
      if (initialized) return;

      if (initialQuery) {
        // Clean URL params to avoid re-triggering on refresh
        window.history.replaceState({}, '', `/c/${params.id}`);
        setInitialized(true);
        handleChat(initialQuery, initialMode);
      } else {
        // Try fetching existing chat
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data, error } = await supabase
            .from("chats")
            .select("history, title")
            .eq("id", params.id)
            .single();
            
          if (data && data.history) {
            setChatHistory(data.history);
          }
        }
        setInitialized(true);
      }
    };
    
    initChat();
  }, [initialQuery, initialMode, initialized, params.id, supabase]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [chatHistory]);

  const saveToSupabase = async (historyToSave: ChatTurn[], firstMessageText?: string) => {
    const currentUser = user || (await supabase.auth.getSession()).data.session?.user;
    if (!currentUser) return;

    try {
      const payload: any = {
        id: params.id,
        user_id: currentUser.id,
        history: historyToSave,
        updated_at: new Date().toISOString(),
      };
      
      if (firstMessageText) {
        payload.title = firstMessageText.substring(0, 50);
      }

      await supabase.from("chats").upsert(payload);
    } catch (e) {
      console.error("Failed to save chat to Supabase", e);
    }
  };

  const handleChat = async (text: string, currentMode: string) => {
    if ((!text.trim() && !selectedFile) || isSearching) return;
    
    let fileData: string | undefined;
    let fileType: string | undefined;
    if (selectedFile) {
      fileData = await readFileAsBase64(selectedFile);
      fileType = selectedFile.type;
    }

    const userMsg: Message = { role: "user", content: text };
    const currentHistory = [...chatHistory];
    const newHistory: ChatTurn[] = [...currentHistory, { message: userMsg }];
    const isFirstMessage = currentHistory.length === 0;
    
    setChatHistory([...newHistory, { message: { role: "assistant", content: "" }, isLoading: true }]);
    setSelectedFile(null);
    setIsSearching(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newHistory.map(t => t.message),
          focus_mode: currentMode,
          file_data: fileData,
          file_type: fileType,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch response");
      }

      const data = await response.json();
      
      const completedHistory: ChatTurn[] = [
        ...newHistory,
        { 
          message: { role: "assistant", content: data.response },
          citations: data.citations,
          confidenceScore: data.confidence_score
        }
      ];
      
      setChatHistory(completedHistory);
      
      saveToSupabase(completedHistory, isFirstMessage ? text : undefined);

    } catch (error) {
      console.error(error);
      setChatHistory([
        ...newHistory,
        { 
          message: { role: "assistant", content: "Sorry, I encountered an error while processing your request. Please ensure the backend is running and API keys are set." }
        }
      ]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const textToSubmit = query;
    setQuery("");
    handleChat(textToSubmit, focusMode);
  };

  const handleNewChat = () => {
    router.push("/");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
    e.target.value = "";
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const fetchChats = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const { data } = await supabase
      .from("chats")
      .select("id, title, updated_at")
      .eq("user_id", session.user.id)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (data) setChatList(data);
  }, [supabase]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats, chatHistory]);

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("chats").delete().eq("id", chatId);
    setChatList(prev => prev.filter(c => c.id !== chatId));
  };

  const handleSelectChat = (chatId: string) => {
    setSidebarOpen(false);
    router.push(`/c/${chatId}`);
  };

  if (!initialized) return null;

  return (
    <div className="flex h-screen w-full">
      {/* Sidebar */}
      <aside className={`fixed md:relative z-20 h-full bg-background border-r transition-all duration-300 flex flex-col ${sidebarOpen ? "w-72" : "w-0 md:w-0 overflow-hidden"}`}>
        {sidebarOpen && (
          <>
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold text-sm">Chat History</h2>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSidebarOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {chatList.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">No chats yet</p>
                )}
                {chatList.map(chat => (
                  <div
                    key={chat.id}
                    onClick={() => handleSelectChat(chat.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm hover:bg-muted transition-colors group ${chat.id === params.id ? "bg-muted" : ""}`}
                  >
                    <MessageSquare className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <span className="truncate flex-1">{chat.title || "Untitled"}</span>
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
          </>
        )}
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-10 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main chat area */}
      <main className="flex-1 flex flex-col h-screen w-full max-w-4xl mx-auto p-4 md:p-8">
        <header className="flex items-center justify-between py-4 border-b">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold cursor-pointer" onClick={handleNewChat}>Kai.</h1>
            <DropdownMenu>
              <DropdownMenuTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-full h-7 text-xs font-medium bg-muted/50 border-none gap-1")}>
                {focusMode} <ChevronDown className="h-3 w-3 text-muted-foreground" />
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
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleNewChat} className="gap-2 text-muted-foreground">
              <RotateCcw className="w-4 h-4" /> New Chat
            </Button>
          </div>
        </header>
        
        <ScrollArea className="flex-1 pr-4 py-8" ref={scrollRef}>
          <div className="space-y-8 pb-12">
            {chatHistory.map((turn, idx) => (
              <div key={idx} className={`flex flex-col ${turn.message.role === "user" ? "items-end" : "items-start"}`}>
                <div className={`max-w-[85%] rounded-3xl px-5 py-4 ${
                  turn.message.role === "user" 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted/50 text-foreground"
                }`}>
                  {turn.isLoading ? (
                    <div className="flex gap-1.5 items-center text-muted-foreground h-6">
                      <div className="w-2 h-2 rounded-full bg-current animate-bounce" />
                      <div className="w-2 h-2 rounded-full bg-current animate-bounce delay-75" />
                      <div className="w-2 h-2 rounded-full bg-current animate-bounce delay-150" />
                    </div>
                  ) : (
                    <div className="prose prose-sm md:prose-base dark:prose-invert">
                      {turn.message.content.split('\n').map((line, i) => (
                        <p key={i} className="mb-2 last:mb-0 leading-relaxed">{line}</p>
                      ))}
                    </div>
                  )}
                </div>
                

              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="pt-4 mt-auto border-t bg-background">
          {selectedFile && (
            <div className="px-1 pb-2 text-xs text-muted-foreground flex items-center gap-2">
              <Paperclip className="h-3 w-3" />
              <span className="truncate max-w-[200px]">{selectedFile.name}</span>
              <button onClick={() => setSelectedFile(null)} className="hover:text-foreground ml-1">&times;</button>
            </div>
          )}
          <form onSubmit={handleSubmit} className="relative flex items-center w-full shadow-sm rounded-3xl bg-muted/30 border focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent transition-all p-1">
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
              className="rounded-full text-muted-foreground hover:bg-transparent flex-shrink-0 ml-1"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a follow-up..."
              className="flex-1 px-4 py-6 border-none shadow-none focus-visible:ring-0 text-base bg-transparent"
              disabled={isSearching}
            />
            
            <Button 
              type="submit" 
              size="icon" 
              disabled={(!query.trim() && !selectedFile) || isSearching}
              className={`rounded-full flex-shrink-0 mr-1 transition-all ${(query.trim() || selectedFile) && !isSearching ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              <ArrowUp className="h-5 w-5" />
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center h-screen text-muted-foreground">Loading chat...</div>}>
      <ChatComponent />
    </Suspense>
  );
}
