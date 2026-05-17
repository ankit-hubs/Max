"use client";

import { Suspense, useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import {
  Menu, X, Shield, Paperclip, ArrowUp, Link as LinkIcon, RotateCcw,
  ChevronDown, Check, MessageSquare, Trash2, Bookmark, BookmarkCheck,
  Mic, MicOff, Edit2,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { CopyButton } from "@/components/CopyButton";
import { CitationsDisplay } from "@/components/CitationsDisplay";
import { ConfidenceScore } from "@/components/ConfidenceScore";
import { TypingIndicator } from "@/components/TypingIndicator";
import { ChatSkeleton } from "@/components/Skeletons";
import { ChatActions } from "@/components/ChatActions";
import { FeedbackButtons } from "@/components/FeedbackButtons";
import { ChatSearch } from "@/components/ChatSearch";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useFeedback } from "@/hooks/useFeedback";
import { useUsageStats } from "@/hooks/useUsageStats";
import { useBookmarks } from "@/hooks/useBookmarks";

export type Message = {
  role: "user" | "assistant";
  content: string;
};

export type Citation = {
  title: string;
  url: string;
};

export type ChatTurn = {
  message: Message;
  citations?: Citation[];
  confidenceScore?: number;
  isLoading?: boolean;
};

const FOCUS_MODES = ["Default", "Academic", "News", "Internal", "Deep Research"];

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
  const [chatList, setChatList] = useState<{ id: string; title: string; updated_at: string; is_bookmarked: boolean }[]>([]);
  const [filteredChatList, setFilteredChatList] = useState<typeof chatList>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [typingStatus, setTypingStatus] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isListening, transcript, isSupported, startListening, stopListening, resetTranscript } = useVoiceInput();
  const { feedback, submitFeedback, loadFeedback } = useFeedback();
  const { incrementStat } = useUsageStats();
  const { toggleBookmark } = useBookmarks();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    fetchUser();
  }, [supabase.auth]);

  useEffect(() => {
    if (transcript) {
      setQuery(transcript);
    }
  }, [transcript]);

  useEffect(() => {
    const initChat = async () => {
      if (initialized) return;

      if (initialQuery) {
        window.history.replaceState({}, '', `/c/${params.id}`);
        setInitialized(true);
        handleChat(initialQuery, initialMode);
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data, error } = await supabase
            .from("chats")
            .select("history, title, is_bookmarked")
            .eq("id", params.id)
            .single();

          if (data && data.history) {
            setChatHistory(data.history);
            setIsBookmarked(data.is_bookmarked || false);
            loadFeedback(params.id as string);
          }
        }
        setInitialized(true);
      }
    };

    initChat();
  }, [initialQuery, initialMode, initialized, params.id, supabase]);

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
    setTypingStatus("Analyzing your query...");

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

      setTypingStatus("Searching the web...");

      const data = await response.json();

      setTypingStatus("Generating response...");

      const completedHistory: ChatTurn[] = [
        ...newHistory,
        {
          message: { role: "assistant", content: data.response },
          citations: data.citations,
          confidenceScore: data.confidence_score,
        }
      ];

      setChatHistory(completedHistory);
      setTypingStatus(null);

      saveToSupabase(completedHistory, isFirstMessage ? text : undefined);
      incrementStat("total_queries");
      if (data.citations?.length > 0) incrementStat("total_searches");

    } catch (error) {
      console.error(error);
      setChatHistory([
        ...newHistory,
        {
          message: { role: "assistant", content: "Sorry, I encountered an error while processing your request. Please ensure the backend is running and API keys are set." }
        }
      ]);
      setTypingStatus(null);
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
    router.push(`/c/${crypto.randomUUID()}`);
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
      .select("id, title, updated_at, is_bookmarked")
      .eq("user_id", session.user.id)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (data) {
      setChatList(data);
      setFilteredChatList(data);
    }
  }, [supabase]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats, chatHistory]);

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("chats").delete().eq("id", chatId);
    setChatList(prev => prev.filter(c => c.id !== chatId));
    setFilteredChatList(prev => prev.filter(c => c.id !== chatId));
    if (chatId === params.id) {
      router.push("/");
    }
  };

  const handleSelectChat = (chatId: string) => {
    setSidebarOpen(false);
    router.push(`/c/${chatId}`);
  };

  const handleSearchChats = (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setFilteredChatList(chatList);
    } else {
      setFilteredChatList(
        chatList.filter(c =>
          (c.title || "").toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
  };

  const handleClearSearch = () => {
    setFilteredChatList(chatList);
  };

  const handleToggleBookmark = async () => {
    await toggleBookmark(params.id as string, isBookmarked);
    setIsBookmarked(!isBookmarked);
  };

  const handleRetry = async (index: number) => {
    const prevTurn = chatHistory[index - 1];
    if (!prevTurn || prevTurn.message.role !== "user") return;

    const newHistory = chatHistory.slice(0, index);
    setChatHistory([...newHistory, { message: { role: "assistant", content: "" }, isLoading: true }]);
    setIsSearching(true);
    setTypingStatus("Retrying...");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newHistory.slice(0, -1).map(t => t.message).concat([prevTurn.message]),
          focus_mode: focusMode,
        }),
      });

      const data = await response.json();

      const completedHistory: ChatTurn[] = [
        ...newHistory.slice(0, -1),
        {
          message: { role: "assistant", content: data.response },
          citations: data.citations,
          confidenceScore: data.confidence_score,
        }
      ];

      setChatHistory(completedHistory);
      saveToSupabase(completedHistory);
    } catch (error) {
      console.error(error);
      setChatHistory([
        ...newHistory.slice(0, -1),
        { message: { role: "assistant", content: "Retry failed. Please try again." } }
      ]);
    } finally {
      setIsSearching(false);
      setTypingStatus(null);
    }
  };

  const handleEditMessage = async (index: number, newContent: string) => {
    const newHistory = chatHistory.slice(0, index);
    newHistory.push({ message: { role: "user", content: newContent } });
    setChatHistory([...newHistory, { message: { role: "assistant", content: "" }, isLoading: true }]);
    setIsSearching(true);
    setTypingStatus("Processing edited message...");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newHistory.map(t => t.message),
          focus_mode: focusMode,
        }),
      });

      const data = await response.json();

      const completedHistory: ChatTurn[] = [
        ...newHistory,
        {
          message: { role: "assistant", content: data.response },
          citations: data.citations,
          confidenceScore: data.confidence_score,
        }
      ];

      setChatHistory(completedHistory);
      saveToSupabase(completedHistory);
    } catch (error) {
      console.error(error);
      setChatHistory([
        ...newHistory,
        { message: { role: "assistant", content: "Failed to process edited message." } }
      ]);
    } finally {
      setIsSearching(false);
      setTypingStatus(null);
    }
  };

  const toggleVoice = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  };

  useKeyboardShortcuts({
    "ctrl+n": () => handleNewChat(),
    "meta+n": () => handleNewChat(),
    "escape": () => setSidebarOpen(false),
    "ctrl+k": () => {
      const input = document.querySelector('input[placeholder="Ask a follow-up..."]') as HTMLInputElement;
      input?.focus();
    },
    "meta+k": () => {
      const input = document.querySelector('input[placeholder="Ask a follow-up..."]') as HTMLInputElement;
      input?.focus();
    },
  }, initialized);

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
            <ChatSearch onSearch={handleSearchChats} onClear={handleClearSearch} />
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {filteredChatList.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">No chats yet</p>
                )}
                {filteredChatList.map(chat => (
                  <div
                    key={chat.id}
                    onClick={() => handleSelectChat(chat.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm hover:bg-muted transition-colors group ${chat.id === params.id ? "bg-muted" : ""}`}
                  >
                    {chat.is_bookmarked ? (
                      <BookmarkCheck className="h-4 w-4 flex-shrink-0 text-yellow-500" />
                    ) : (
                      <MessageSquare className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    )}
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
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push("/profile")}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleNewChat} className="gap-2 text-muted-foreground">
              <RotateCcw className="w-4 h-4" /> New Chat
            </Button>
            {chatHistory.length > 0 && (
              <ChatActions
                chatId={params.id as string}
                chatTitle={chatHistory[0]?.message.content?.substring(0, 50) || "Chat"}
                chatHistory={chatHistory}
                isBookmarked={isBookmarked}
                onDelete={() => handleDeleteChat(params.id as string, {} as any)}
              />
            )}
          </div>
        </header>

        <ScrollArea className="flex-1 pr-4 py-8" ref={scrollRef}>
          {chatHistory.length === 0 && !isSearching ? (
            <ChatSkeleton />
          ) : (
            <div className="space-y-8 pb-12">
              {chatHistory.map((turn, idx) => (
                <div key={idx} className={`flex flex-col group ${turn.message.role === "user" ? "items-end" : "items-start"}`}>
                  <div className={`max-w-[85%] rounded-3xl px-5 py-4 ${
                    turn.message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-foreground"
                  }`}>
                    {turn.isLoading ? (
                      <TypingIndicator status={typingStatus || undefined} />
                    ) : (
                      <>
                        {turn.message.role === "assistant" ? (
                          <MarkdownRenderer content={turn.message.content} />
                        ) : (
                          <p className="leading-relaxed">{turn.message.content}</p>
                        )}
                      </>
                    )}
                  </div>

                  {!turn.isLoading && turn.message.role === "assistant" && (
                    <div className="flex items-center gap-2 mt-2 max-w-[85%]">
                      <CopyButton text={turn.message.content} />
                      {turn.confidenceScore && (
                        <ConfidenceScore score={turn.confidenceScore} />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => handleRetry(idx)}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}

                  {turn.citations && !turn.isLoading && (
                    <CitationsDisplay citations={turn.citations} />
                  )}

                  {!turn.isLoading && turn.message.role === "assistant" && (
                    <FeedbackButtons
                      chatId={params.id as string}
                      messageIndex={idx}
                      currentFeedback={feedback[`${params.id}-${idx}`]}
                      onFeedback={(rating, comment) => submitFeedback(params.id as string, idx, rating, comment)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="pt-4 mt-auto border-t bg-background">
          {selectedFile && (
            <div className="px-1 pb-2 text-xs text-muted-foreground flex items-center gap-2">
              <Paperclip className="h-3 w-3" />
              <span className="truncate max-w-[200px]">{selectedFile.name}</span>
              <button onClick={() => setSelectedFile(null)} className="hover:text-foreground ml-1">&times;</button>
            </div>
          )}
          {isListening && (
            <div className="px-1 pb-2 text-xs text-red-500 flex items-center gap-2 animate-pulse">
              <Mic className="h-3 w-3" />
              <span>Listening...</span>
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

            {isSupported && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggleVoice}
                className={cn(
                  "rounded-full text-muted-foreground hover:bg-transparent flex-shrink-0",
                  isListening && "text-red-500"
                )}
              >
                {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>
            )}

            <Button
              type="submit"
              size="icon"
              disabled={(!query.trim() && !selectedFile) || isSearching}
              className={`rounded-full flex-shrink-0 mr-1 transition-all ${(query.trim() || selectedFile) && !isSearching ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              <ArrowUp className="h-5 w-5" />
            </Button>
          </form>
          <p className="text-center text-xs text-muted-foreground mt-2">
            Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Ctrl+N</kbd> for new chat · <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Ctrl+K</kbd> to focus input
          </p>
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
