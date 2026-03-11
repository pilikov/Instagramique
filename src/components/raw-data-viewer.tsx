"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Code, Copy, Check, Loader2, RefreshCw } from "lucide-react";

const ENDPOINTS = [
  { id: "profile", label: "Профиль", desc: "Данные профиля пользователя" },
  { id: "media", label: "Медиа", desc: "Все публикации" },
  { id: "stories", label: "Сториз", desc: "Текущие сториз (24ч)" },
  { id: "tags", label: "Теги", desc: "Публикации с отметками" },
  { id: "user_insights", label: "Инсайты аккаунта", desc: "Метрики аккаунта" },
  { id: "live_media", label: "Live", desc: "Прямые эфиры" },
] as const;

export function RawDataViewer() {
  const [activeEndpoint, setActiveEndpoint] = useState("profile");
  const [data, setData] = useState<Record<string, unknown>>({});
  const [loadingEndpoint, setLoadingEndpoint] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchEndpoint = useCallback(async (endpoint: string) => {
    const token = localStorage.getItem("ig_access_token");
    if (!token) return;
    setLoadingEndpoint(endpoint);
    try {
      const res = await fetch(`/api/instagram?endpoint=${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      setData((prev) => ({ ...prev, [endpoint]: result }));
    } catch (err) {
      setData((prev) => ({ ...prev, [endpoint]: { error: String(err) } }));
    } finally {
      setLoadingEndpoint(null);
    }
  }, []);

  useEffect(() => {
    if (!data[activeEndpoint]) {
      fetchEndpoint(activeEndpoint);
    }
  }, [activeEndpoint, data, fetchEndpoint]);

  const handleCopy = async () => {
    const text = JSON.stringify(data[activeEndpoint], null, 2);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code className="w-5 h-5" />
          Raw API данные
        </CardTitle>
        <CardDescription>
          Все данные, доступные через Instagram Graph API
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4">
          {ENDPOINTS.map((ep) => (
            <Button
              key={ep.id}
              variant={activeEndpoint === ep.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveEndpoint(ep.id)}
              className="text-xs"
            >
              {ep.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              GET /api/instagram?endpoint={activeEndpoint}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => fetchEndpoint(activeEndpoint)}
              disabled={loadingEndpoint === activeEndpoint}
            >
              {loadingEndpoint === activeEndpoint ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCopy} disabled={!data[activeEndpoint]}>
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>

        {loadingEndpoint === activeEndpoint && !data[activeEndpoint] ? (
          <Skeleton className="h-64" />
        ) : data[activeEndpoint] ? (
          <ScrollArea className="h-[400px] rounded-lg border bg-muted/30">
            <pre className="p-4 text-xs font-mono whitespace-pre-wrap break-all">
              {JSON.stringify(data[activeEndpoint], null, 2)}
            </pre>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Выберите endpoint для запроса
          </div>
        )}

        <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground space-y-1.5">
          <p className="font-medium text-foreground">Доступные эндпоинты Instagram Graph API:</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            <li>GET /me — Профиль (id, username, biography, followers_count...)</li>
            <li>GET /me/media — Публикации (caption, media_type, likes...)</li>
            <li>GET /me/stories — Активные сториз (24ч)</li>
            <li>GET /me/tags — Публикации с отметками</li>
            <li>GET /me/live_media — Прямые эфиры</li>
            <li>GET /me/insights — Метрики аккаунта (reach, impressions...)</li>
            <li>GET /media_id/insights — Метрики публикации</li>
            <li>GET /media_id/comments — Комментарии и ответы</li>
          </ul>
          <p className="pt-1">
            <span className="font-medium">Meta Business:</span> demographics, online_followers, audience_city, audience_country, audience_gender_age
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
