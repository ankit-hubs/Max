"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Share2,
  Download,
  FileText,
  FileDown,
  Bookmark,
  BookmarkCheck,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/utils/supabase/client";
import { exportAsTXT, exportAsPDF } from "@/lib/exportChat";
import { useShareChat } from "@/hooks/useShareChat";
import { useBookmarks } from "@/hooks/useBookmarks";
import type { ChatTurn } from "@/app/c/[id]/page";

interface ChatActionsProps {
  chatId: string;
  chatTitle: string;
  chatHistory: ChatTurn[];
  isBookmarked: boolean;
  onDelete: () => void;
}

export function ChatActions({
  chatId,
  chatTitle,
  chatHistory,
  isBookmarked,
  onDelete,
}: ChatActionsProps) {
  const router = useRouter();
  const { shareChat, sharedLink, loading: shareLoading } = useShareChat();
  const { toggleBookmark } = useBookmarks();
  const [showExport, setShowExport] = useState(false);

  const handleShare = async () => {
    await shareChat(chatId);
  };

  const handleExportTXT = () => {
    exportAsTXT(chatHistory, chatTitle || "Chat");
  };

  const handleExportPDF = () => {
    exportAsPDF(chatHistory, chatTitle || "Chat");
  };

  const handleBookmark = () => {
    toggleBookmark(chatId, isBookmarked);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Share2 className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleShare} disabled={shareLoading}>
            <Share2 className="mr-2 h-4 w-4" />
            <span>{sharedLink ? "Link copied!" : "Share chat"}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleBookmark}>
            {isBookmarked ? (
              <BookmarkCheck className="mr-2 h-4 w-4" />
            ) : (
              <Bookmark className="mr-2 h-4 w-4" />
            )}
            <span>{isBookmarked ? "Remove bookmark" : "Bookmark chat"}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowExport(true)}>
            <Download className="mr-2 h-4 w-4" />
            <span>Export chat</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onDelete}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Delete chat</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {showExport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-background rounded-lg p-6 w-80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Export Chat</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowExport(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => {
                  handleExportTXT();
                  setShowExport(false);
                }}
              >
                <FileText className="h-4 w-4" />
                Export as TXT
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => {
                  handleExportPDF();
                  setShowExport(false);
                }}
              >
                <FileDown className="h-4 w-4" />
                Export as PDF
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
