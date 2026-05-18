"use client";

import { cn } from "@/lib/utils";

interface ConfidenceScoreProps {
  score: number;
  className?: string;
}

export function ConfidenceScore({ score, className }: ConfidenceScoreProps) {
  const getColor = (s: number) => {
    if (s >= 80) return "bg-green-500";
    if (s >= 60) return "bg-yellow-500";
    if (s >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  const getLabel = (s: number) => {
    if (s >= 80) return "High confidence";
    if (s >= 60) return "Moderate confidence";
    if (s >= 40) return "Low confidence";
    return "Very low confidence";
  };

  return (
    <div className={cn("flex items-center gap-2 mt-2", className)}>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[100px]">
        <div
          className={cn("h-full rounded-full transition-all duration-500", getColor(score))}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground">{getLabel(score)} ({score}%)</span>
    </div>
  );
}
