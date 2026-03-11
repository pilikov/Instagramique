"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import type { InstagramInsight, InstagramMedia } from "@/lib/types";
import { BarChart3, Eye, Users, Heart, MessageCircle, Share2, Bookmark, TrendingUp, Loader2 } from "lucide-react";

interface InsightsPanelProps {
  media: InstagramMedia[];
  loading: boolean;
}

const insightIcons: Record<string, typeof Eye> = {
  reach: Users,
  follower_count: Users,
  views: Eye,
  likes: Heart,
  comments: MessageCircle,
  shares: Share2,
  saved: Bookmark,
  saves: Bookmark,
  total_interactions: BarChart3,
  profile_views: Eye,
  accounts_engaged: Users,
  content_views: Eye,
};

const insightLabels: Record<string, string> = {
  reach: "Охват",
  follower_count: "Подписчики",
  views: "Просмотры",
  likes: "Лайки",
  comments: "Комментарии",
  shares: "Репосты",
  saved: "Сохранения",
  saves: "Сохранения",
  total_interactions: "Взаимодействия",
  profile_views: "Просмотры профиля",
  accounts_engaged: "Активные аккаунты",
  content_views: "Просмотры контента",
};

export function InsightsPanel({ media, loading }: InsightsPanelProps) {
  const [userInsights, setUserInsights] = useState<InstagramInsight[]>([]);
  const [mediaInsights, setMediaInsights] = useState<Record<string, InstagramInsight[]>>({});
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [loadingMediaInsight, setLoadingMediaInsight] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadUserInsights = useCallback(async () => {
    const token = localStorage.getItem("ig_access_token");
    if (!token) return;
    setLoadingInsights(true);
    setError(null);
    try {
      const res = await fetch("/api/instagram?endpoint=user_insights&period=day", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.data) {
        setUserInsights(data.data);
      } else if (data.error) {
        setError(data.error);
      }
    } catch {
      setError("Не удалось загрузить инсайты аккаунта");
    } finally {
      setLoadingInsights(false);
    }
  }, []);

  const loadMediaInsights = useCallback(async (mediaId: string) => {
    if (mediaInsights[mediaId]) {
      setSelectedMedia(selectedMedia === mediaId ? null : mediaId);
      return;
    }
    const token = localStorage.getItem("ig_access_token");
    if (!token) return;
    setLoadingMediaInsight(mediaId);
    try {
      const res = await fetch(`/api/instagram?endpoint=media_insights&media_id=${mediaId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.data) {
        setMediaInsights((prev) => ({ ...prev, [mediaId]: data.data }));
        setSelectedMedia(mediaId);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingMediaInsight(null);
    }
  }, [mediaInsights, selectedMedia]);

  useEffect(() => {
    loadUserInsights();
  }, [loadUserInsights]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Инсайты</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Инсайты аккаунта
          </CardTitle>
          <CardDescription>Статистика за последние дни (период: day)</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingInsights ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-2">{error}</p>
              <p className="text-xs text-muted-foreground">
                Инсайты доступны только для бизнес-аккаунтов и аккаунтов авторов
              </p>
              <Button variant="outline" size="sm" className="mt-3" onClick={loadUserInsights}>
                Повторить
              </Button>
            </div>
          ) : userInsights.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Нет данных инсайтов</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {userInsights.map((insight) => {
                const Icon = insightIcons[insight.name] || BarChart3;
                const latestValue = insight.values?.[insight.values.length - 1]?.value ?? 0;
                return (
                  <div key={insight.id} className="p-3 rounded-lg bg-muted/50 space-y-1">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Icon className="w-3.5 h-3.5" />
                      <span className="text-xs">{insightLabels[insight.name] || insight.name}</span>
                    </div>
                    <p className="text-xl font-bold">{latestValue.toLocaleString("ru-RU")}</p>
                    {insight.values?.[insight.values.length - 1]?.end_time && (
                      <p className="text-xs text-muted-foreground">
                        до {new Date(insight.values[insight.values.length - 1].end_time!).toLocaleDateString("ru-RU")}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Инсайты публикаций
          </CardTitle>
          <CardDescription>Нажмите на публикацию для просмотра метрик</CardDescription>
        </CardHeader>
        <CardContent>
          {media.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">Нет публикаций</p>
          ) : (
            <div className="space-y-2">
              {media.slice(0, 10).map((item) => (
                <div key={item.id} className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() => loadMediaInsights(item.id)}
                    className="w-full text-left p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{item.caption?.slice(0, 60) || "Без подписи"}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{item.media_type}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.timestamp).toLocaleDateString("ru-RU")}
                        </span>
                      </div>
                    </div>
                    {loadingMediaInsight === item.id && <Loader2 className="w-4 h-4 animate-spin" />}
                  </button>

                  {selectedMedia === item.id && mediaInsights[item.id] && (
                    <div className="px-3 pb-3">
                      <Separator className="mb-3" />
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {mediaInsights[item.id].map((insight) => {
                          const Icon = insightIcons[insight.name] || BarChart3;
                          return (
                            <div key={insight.id} className="p-2 rounded bg-muted/30 text-center">
                              <Icon className="w-3.5 h-3.5 mx-auto text-muted-foreground" />
                              <p className="text-lg font-semibold mt-1">
                                {(insight.values?.[0]?.value ?? 0).toLocaleString("ru-RU")}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {insightLabels[insight.name] || insight.name}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
