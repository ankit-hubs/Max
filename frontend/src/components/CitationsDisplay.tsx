"use client";

import { ExternalLink } from "lucide-react";

interface Citation {
  title: string;
  url: string;
}

interface CitationsDisplayProps {
  citations: Citation[];
}

export function CitationsDisplay({ citations }: CitationsDisplayProps) {
  if (!citations || citations.length === 0) return null;

  return (
    <div className="mt-3">
      <p className="text-xs font-medium text-muted-foreground mb-2">Sources:</p>
      <div className="flex flex-wrap gap-2">
        {citations.map((citation, idx) => (
          <a
            key={idx}
            href={citation.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/50 hover:bg-muted text-xs text-muted-foreground hover:text-foreground transition-colors max-w-[200px]"
          >
            <span className="truncate">{citation.title || `Source ${idx + 1}`}</span>
            <ExternalLink className="h-3 w-3 flex-shrink-0" />
          </a>
        ))}
      </div>
    </div>
  );
}
