"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FeedbackButtonsProps {
  chatId: string;
  messageIndex: number;
  currentFeedback?: "up" | "down";
  onFeedback: (rating: "up" | "down", comment?: string) => void;
}

export function FeedbackButtons({
  chatId,
  messageIndex,
  currentFeedback,
  onFeedback,
}: FeedbackButtonsProps) {
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");
  const [pendingRating, setPendingRating] = useState<"up" | "down" | null>(null);

  const handleFeedback = (rating: "up" | "down") => {
    if (currentFeedback === rating) {
      onFeedback(rating, "");
      setShowComment(false);
      return;
    }
    setPendingRating(rating);
    setShowComment(true);
  };

  const submitComment = () => {
    if (pendingRating) {
      onFeedback(pendingRating, comment);
      setShowComment(false);
      setComment("");
      setPendingRating(null);
    }
  };

  return (
    <div className="flex items-center gap-1 mt-2">
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-7 w-7",
          currentFeedback === "up" && "text-green-500 bg-green-500/10"
        )}
        onClick={() => handleFeedback("up")}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-7 w-7",
          currentFeedback === "down" && "text-red-500 bg-red-500/10"
        )}
        onClick={() => handleFeedback("down")}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </Button>
      {showComment && (
        <div className="flex items-center gap-2 ml-2">
          <div className="relative">
            <MessageSquare className="h-3 w-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment (optional)"
              className="pl-7 pr-2 py-1 text-xs border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary w-48"
              onKeyDown={(e) => e.key === "Enter" && submitComment()}
              autoFocus
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={submitComment}
          >
            Submit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              setShowComment(false);
              setComment("");
              setPendingRating(null);
            }}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
