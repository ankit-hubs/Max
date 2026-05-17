"use client";

import { Loader2 } from "lucide-react";

interface TypingIndicatorProps {
  status?: string;
}

const STATUSES = [
  "Analyzing your query...",
  "Searching the web...",
  "Synthesizing results...",
  "Generating response...",
];

export function TypingIndicator({ status }: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-3 text-muted-foreground text-sm">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="animate-pulse">{status || STATUSES[0]}</span>
    </div>
  );
}

export function useTypingStatus(isSearching: boolean) {
  if (!isSearching) return null;

  return (
    <div className="flex items-center gap-3 text-muted-foreground text-sm px-5 py-3">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="animate-pulse">Analyzing your query...</span>
    </div>
  );
}
