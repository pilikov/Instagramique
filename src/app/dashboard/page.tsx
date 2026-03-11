"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ProfileCard } from "@/components/profile-card";
import { MediaGrid } from "@/components/media-grid";
import { CommentsList } from "@/components/comments-list";
import { InsightsPanel } from "@/components/insights-panel";
import { RawDataViewer } from "@/components/raw-data-viewer";
import type { InstagramProfile, InstagramMedia } from "@/lib/types";
import {
  Instagram, LogOut, Sun, Moon, ImageIcon, Film,
  Clock, MessageCircle, BarChart3, Code, LayoutDashboard, RefreshCw
} from "lucide-react";
import { useTheme } from "next-themes";

export default function DashboardPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const [profile, setProfile] = useState<InstagramProfile | null>(null);
  const [media, setMedia] = useState<InstagramMedia[]>([]);
  const [stories, setStories] = useState<InstagramMedia[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingMedia, setLoadingMedia] = useState(true);
  const [loadingStories, setLoadingStories] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const fetchAPI = useCallback(async (endpoint: string, params?: Record<string, string>) => {
    const token = localStorage.getItem("ig_access_token");
    const userId = localStorage.getItem("ig_user_id");
    if (!token) throw new Error("No token");

    const searchParams = new URLSearchParams({ endpoint });
    if (userId) searchParams.set("user_id", userId);
    if (params) Object.entries(params).forEach(([k, v]) => searchParams.set(k, v));

    const res = await fetch(`/api/instagram?${searchParams}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("ig_access_token");
    if (!token) {
      router.push("/");
      return;
    }

    fetchAPI("profile").then((data) => {
      if (data.error) {
        console.error("Profile error:", data.error);
      } else {
        setProfile(data);
      }
      setLoadingProfile(false);
    });

    fetchAPI("media").then((data) => {
      if (data.data) {
        setMedia(data.data);
        setNextCursor(data.paging?.cursors?.after || null);
      }
      setLoadingMedia(false);
    });

    fetchAPI("stories").then((data) => {
      if (data.data) setStories(data.data);
      setLoadingStories(false);
    });
  }, [router, fetchAPI]);

  const loadMoreMedia = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await fetchAPI("media", { after: nextCursor });
      if (data.data) {
        setMedia((prev) => [...prev, ...data.data]);
        setNextCursor(data.paging?.cursors?.after || null);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("ig_access_token");
    localStorage.removeItem("ig_user_id");
    router.push("/");
  };

  const reels = media.filter((m) => m.media_type === "REEL");
  const posts = media.filter((m) => m.media_type !== "REEL");

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737]">
                <Instagram className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg font-bold hidden sm:block">Instagramique</h1>
            </div>

            <div className="flex items-center gap-2">
              {profile && (
                <span className="text-sm text-muted-foreground hidden md:block">
                  @{profile.username}
                </span>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.location.reload()}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Обновить данные</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  >
                    <Sun className="w-4 h-4 hidden dark:block" />
                    <Moon className="w-4 h-4 dark:hidden" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Переключить тему</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={handleLogout}>
                    <LogOut className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Выйти</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          <ProfileCard profile={profile} loading={loadingProfile} />

          <Tabs defaultValue="posts" className="space-y-4">
            <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
              <TabsTrigger value="posts" className="gap-1.5">
                <ImageIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Посты</span>
                {posts.length > 0 && (
                  <span className="text-xs bg-muted px-1.5 rounded-full">{posts.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="reels" className="gap-1.5">
                <Film className="w-4 h-4" />
                <span className="hidden sm:inline">Рилзы</span>
                {reels.length > 0 && (
                  <span className="text-xs bg-muted px-1.5 rounded-full">{reels.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="stories" className="gap-1.5">
                <Clock className="w-4 h-4" />
                <span className="hidden sm:inline">Сториз</span>
                {stories.length > 0 && (
                  <span className="text-xs bg-muted px-1.5 rounded-full">{stories.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="all_media" className="gap-1.5">
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Все медиа</span>
              </TabsTrigger>
              <TabsTrigger value="comments" className="gap-1.5">
                <MessageCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Комментарии</span>
              </TabsTrigger>
              <TabsTrigger value="insights" className="gap-1.5">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Инсайты</span>
              </TabsTrigger>
              <TabsTrigger value="raw" className="gap-1.5">
                <Code className="w-4 h-4" />
                <span className="hidden sm:inline">API</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="posts">
              <MediaGrid
                media={posts}
                loading={loadingMedia}
                title="Публикации"
                showFilter
              />
            </TabsContent>

            <TabsContent value="reels">
              <MediaGrid
                media={reels}
                loading={loadingMedia}
                title="Рилзы"
                showFilter={false}
              />
            </TabsContent>

            <TabsContent value="stories">
              <MediaGrid
                media={stories}
                loading={loadingStories}
                title="Сториз"
                showFilter={false}
              />
            </TabsContent>

            <TabsContent value="all_media">
              <MediaGrid
                media={media}
                loading={loadingMedia}
                title="Все медиа"
                onLoadMore={loadMoreMedia}
                hasMore={!!nextCursor}
                loadingMore={loadingMore}
                showFilter
              />
            </TabsContent>

            <TabsContent value="comments">
              <CommentsList media={media} loading={loadingMedia} />
            </TabsContent>

            <TabsContent value="insights">
              <InsightsPanel media={media} loading={loadingMedia} />
            </TabsContent>

            <TabsContent value="raw">
              <RawDataViewer />
            </TabsContent>
          </Tabs>
        </main>

        <footer className="border-t py-4 mt-8">
          <div className="max-w-7xl mx-auto px-4 text-center text-xs text-muted-foreground">
            Instagramique — использует Instagram Graph API v21.0 и Meta Business API
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
}
