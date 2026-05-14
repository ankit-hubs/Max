"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Brain, Zap, Shield, Paperclip, ArrowUp, ChevronDown, Check } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const FOCUS_MODES = ["Default", "Academic", "News", "Internal", "Deep Research"];

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focusMode, setFocusMode] = useState("Default");
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
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

  return (
    <div className="flex flex-col min-h-screen">
      <header className="absolute top-0 right-0 p-4 z-10 w-full flex justify-end">
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
            </div>
            {fileName && (
              <div className="px-4 text-xs text-muted-foreground flex items-center gap-2 mt-1">
                <Paperclip className="h-3 w-3" />
                <span className="truncate max-w-[200px]">{fileName}</span>
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
    </main>
    </div>
  );
}
