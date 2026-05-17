"use client";

import { useState } from "react";
import { Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EditableMessageProps {
  content: string;
  isUser: boolean;
  onSave: (newContent: string) => void;
  onRetry?: () => void;
}

export function EditableMessage({
  content,
  isUser,
  onSave,
  onRetry,
}: EditableMessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);

  if (!isUser) {
    return null;
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="flex-1 px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={2}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.metaKey) {
              onSave(editContent);
              setIsEditing(false);
            }
            if (e.key === "Escape") {
              setEditContent(content);
              setIsEditing(false);
            }
          }}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => {
            onSave(editContent);
            setIsEditing(false);
          }}
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => {
            setEditContent(content);
            setIsEditing(false);
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
      onClick={() => setIsEditing(true)}
    >
      <Edit2 className="h-3 w-3" />
    </Button>
  );
}
