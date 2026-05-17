"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUsageStats } from "@/hooks/useUsageStats";
import { useBookmarks } from "@/hooks/useBookmarks";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  ArrowLeft,
  LogOut,
  Bookmark,
  BarChart3,
  MessageSquare,
  Calendar,
  Mail,
  User,
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { profile, loading, updateProfile, signOut } = useUserProfile();
  const { stats } = useUsageStats();
  const { bookmarkedChats } = useBookmarks();
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    if (profile?.name) setName(profile.name);
  }, [profile]);

  const handleSaveName = async () => {
    await updateProfile({ name });
    setEditingName(false);
  };

  const totalQueries = stats.reduce((sum, s) => sum + s.total_queries, 0);
  const totalSearches = stats.reduce((sum, s) => sum + s.total_searches, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">Please sign in to view your profile.</p>
        <Button onClick={() => router.push("/")}>Go Home</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Profile & Settings</h1>
        </div>
        <ThemeToggle />
      </header>

      <ScrollArea className="flex-1">
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={profile.avatar_url || ""} />
                  <AvatarFallback>
                    {profile.name?.[0]?.toUpperCase() || profile.email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  {editingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="text-lg font-semibold bg-transparent border-b border-primary focus:outline-none"
                        autoFocus
                        onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                      />
                      <Button size="sm" onClick={handleSaveName}>
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingName(false);
                          setName(profile.name || "");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CardTitle className="cursor-pointer" onClick={() => setEditingName(true)}>
                        {profile.name || "Set your name"}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setEditingName(true)}
                      >
                        <User className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <CardDescription className="flex items-center gap-1 mt-1">
                    <Mail className="h-3 w-3" />
                    {profile.email}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Usage Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Usage Statistics
              </CardTitle>
              <CardDescription>Your activity over the last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <p className="text-2xl font-bold">{totalQueries}</p>
                  <p className="text-xs text-muted-foreground">Total Queries</p>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <p className="text-2xl font-bold">{totalSearches}</p>
                  <p className="text-xs text-muted-foreground">Web Searches</p>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <p className="text-2xl font-bold">{bookmarkedChats.length}</p>
                  <p className="text-xs text-muted-foreground">Bookmarks</p>
                </div>
              </div>
              <div className="mt-4 text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Member since {new Date(profile.created_at).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>

          {/* Bookmarked Chats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bookmark className="h-5 w-5" />
                Bookmarked Chats
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bookmarkedChats.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No bookmarked chats yet
                </p>
              ) : (
                <div className="space-y-2">
                  {bookmarkedChats.map((chat) => (
                    <div
                      key={chat.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => router.push(`/c/${chat.id}`)}
                    >
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{chat.title || "Untitled"}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(chat.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Sign Out */}
          <div className="flex justify-end">
            <Button variant="destructive" onClick={signOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
