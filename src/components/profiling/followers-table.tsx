"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users, Search, Filter, RefreshCw, Loader2, ChevronDown, ChevronUp,
  Eye, Zap, Download, Globe, Check, AlertCircle, Chrome,
} from "lucide-react";
import { ImportDialog } from "./import-dialog";
import { ProfileDetail } from "./profile-detail";
import type { FollowerProfile } from "@/lib/profiling/types";

interface ProfilesResponse {
  data: FollowerProfile[];
  total: number;
}

interface BrowserEvent {
  type: "status" | "progress" | "login_required" | "done" | "error";
  message?: string;
  count?: number;
  username?: string;
  total_fetched?: number;
  profiled?: number;
  failed?: number;
}

const SEGMENT_LABELS: Record<string, string> = {
  designer: "Дизайнер", founder: "Фаундер", developer: "Разработчик",
  creator: "Креатор", agency: "Агентство", "school/education": "Образование",
  local_business_owner: "Местный бизнес", athlete: "Атлет", parent: "Родитель",
  lifestyle_consumer: "Лайфстайл", "media/journalist": "Медиа/журналист",
  "recruiter/hr": "HR/Рекрутер", photographer: "Фотограф", marketer: "Маркетолог",
};

const INTENT_LABELS: Record<string, string> = {
  personal: "Личный", professional: "Проф.", creator: "Креатор",
  business: "Бизнес", mixed: "Смешанный",
};

export function FollowersTable() {
  const [profiles, setProfiles] = useState<FollowerProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSegment, setSelectedSegment] = useState("");
  const [selectedInterest, setSelectedInterest] = useState("");
  const [selectedIntent, setSelectedIntent] = useState("");
  const [sortBy, setSortBy] = useState("confidence");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedProfile, setSelectedProfile] = useState<FollowerProfile | null>(null);
  const [reprofilingAll, setReprofilingAll] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Browser flow
  const [browserRunning, setBrowserRunning] = useState(false);
  const [browserEvents, setBrowserEvents] = useState<BrowserEvent[]>([]);
  const [browserDone, setBrowserDone] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Enrich
  const [enrichDialogOpen, setEnrichDialogOpen] = useState(false);
  const [enrichSessionId, setEnrichSessionId] = useState("");
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<{ total: number; succeeded: number; failed: number } | null>(null);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sort_by: sortBy, sort_order: sortOrder, limit: "100" });
      if (searchQuery) params.set("search", searchQuery);
      if (selectedSegment) params.set("segment", selectedSegment);
      if (selectedInterest) params.set("interest", selectedInterest);
      if (selectedIntent) params.set("intent", selectedIntent);

      const res = await fetch(`/api/profiling?${params}`);
      const data: ProfilesResponse = await res.json();
      setProfiles(data.data || []);
      setTotal(data.total || 0);
    } catch {
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedSegment, selectedInterest, selectedIntent, sortBy, sortOrder]);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  // ── Launch browser and stream progress ──

  const handleLaunchBrowser = async () => {
    setBrowserRunning(true);
    setBrowserDone(false);
    setBrowserEvents([]);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const res = await fetch("/api/profiling/browser", {
        method: "POST",
        signal: abort.signal,
      });

      if (!res.body) {
        setBrowserEvents([{ type: "error", message: "Нет ответа от сервера" }]);
        setBrowserRunning(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event: BrowserEvent = JSON.parse(line.slice(6));
              setBrowserEvents((prev) => [...prev, event]);

              if (event.type === "done" || event.type === "error") {
                setBrowserDone(true);
                if (event.type === "done") fetchProfiles();
              }
            } catch { /* malformed event */ }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setBrowserEvents((prev) => [...prev, { type: "error", message: (err as Error).message }]);
      }
    } finally {
      setBrowserRunning(false);
      setBrowserDone(true);
      abortRef.current = null;
    }
  };

  const handleEnrich = async () => {
    setEnriching(true);
    setEnrichResult(null);
    try {
      const res = await fetch("/api/profiling/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "enrich_all", session_id: enrichSessionId.trim() || undefined, delay_ms: 2000 }),
      });
      const data = await res.json();
      setEnrichResult({ total: data.total || 0, succeeded: data.succeeded || 0, failed: data.failed || 0 });
      await fetchProfiles();
    } catch {
      setEnrichResult({ total: 0, succeeded: 0, failed: 1 });
    } finally {
      setEnriching(false);
    }
  };

  const handleReprofileAll = async () => {
    setReprofilingAll(true);
    try {
      await fetch("/api/profiling/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reprofile_all" }),
      });
      await fetchProfiles();
    } finally {
      setReprofilingAll(false);
    }
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    else { setSortBy(field); setSortOrder("desc"); }
  };

  const lowCompleteness = profiles.filter((p) => p.source_completeness_score < 0.3).length;
  const lastEvent = browserEvents[browserEvents.length - 1];
  const lastProgress = [...browserEvents].reverse().find((e) => e.type === "progress");
  const lastDone = [...browserEvents].reverse().find((e) => e.type === "done");
  const lastError = [...browserEvents].reverse().find((e) => e.type === "error");

  if (selectedProfile) {
    return (
      <ProfileDetail
        profile={selectedProfile}
        onBack={() => { setSelectedProfile(null); fetchProfiles(); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Empty state: big CTA ── */}
      {!loading && total === 0 && !browserRunning && !browserDone && (
        <Card className="border-primary/20">
          <CardContent className="py-12">
            <div className="text-center space-y-5 max-w-md mx-auto">
              <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto">
                <Users className="w-12 h-12 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Профилирование подписчиков</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Нажмите кнопку — откроется браузер, вы залогинитесь в Instagram (один раз),
                  и система автоматически загрузит и проанализирует всех ваших подписчиков
                </p>
              </div>
              <Button size="lg" onClick={handleLaunchBrowser} className="gap-2.5 text-base px-8 py-6">
                <Chrome className="w-5 h-5" />
                Профилировать
              </Button>
              <div className="pt-2">
                <ImportDialog onImported={fetchProfiles} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Browser progress ── */}
      {(browserRunning || (browserDone && total === 0)) && (
        <Card className={lastError ? "border-destructive/30" : lastDone ? "border-green-500/30" : "border-primary/30"}>
          <CardContent className="py-6">
            <div className="space-y-4 max-w-md mx-auto">
              {/* Status indicator */}
              <div className="flex items-center gap-3">
                {lastError ? (
                  <AlertCircle className="w-6 h-6 text-destructive shrink-0" />
                ) : lastDone ? (
                  <Check className="w-6 h-6 text-green-500 shrink-0" />
                ) : (
                  <Loader2 className="w-6 h-6 text-primary animate-spin shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">
                    {lastError ? "Ошибка" : lastDone ? "Готово!" : "Загрузка подписчиков..."}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {lastEvent?.message || "Инициализация..."}
                  </p>
                </div>
                {lastProgress && !lastDone && (
                  <span className="text-lg font-bold text-primary tabular-nums">
                    {lastProgress.count}
                  </span>
                )}
              </div>

              {/* Progress bar */}
              {browserRunning && lastProgress && (
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (lastProgress.count || 0) / 10)}%` }}
                  />
                </div>
              )}

              {/* Done stats */}
              {lastDone && (
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <StatMini label="Загружено" value={lastDone.total_fetched || 0} />
                  <StatMini label="Профилировано" value={lastDone.profiled || 0} />
                  <StatMini label="Ошибки" value={lastDone.failed || 0} />
                </div>
              )}

              {/* Error details */}
              {lastError && (
                <div className="p-3 rounded-lg bg-destructive/10 text-sm text-destructive">
                  {lastError.message}
                </div>
              )}

              {/* Event log (collapsible) */}
              {browserEvents.length > 1 && (
                <details className="group">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                    Лог ({browserEvents.length} событий)
                  </summary>
                  <div className="mt-2 max-h-32 overflow-auto text-xs font-mono space-y-0.5 p-2 rounded bg-muted/30">
                    {browserEvents.map((e, i) => (
                      <div key={i} className={e.type === "error" ? "text-destructive" : "text-muted-foreground"}>
                        {e.message}
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {browserDone && (
                  <Button className="flex-1" onClick={() => { setBrowserDone(false); setBrowserEvents([]); fetchProfiles(); }}>
                    Готово
                  </Button>
                )}
                {browserDone && lastError && (
                  <Button variant="outline" className="flex-1" onClick={handleLaunchBrowser}>
                    Попробовать снова
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Enrich hint ── */}
      {total > 0 && lowCompleteness > 0 && (
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-2">
                <Globe className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{lowCompleteness} из {total} профилей содержат только юзернейм</p>
                  <p className="text-xs text-muted-foreground">Обогатите данные — скрейпер загрузит bio, аватарки и статистику</p>
                </div>
              </div>
              <Button size="sm" onClick={() => setEnrichDialogOpen(true)} className="gap-1.5 shrink-0">
                <Download className="w-4 h-4" />
                Обогатить
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Main table card ── */}
      {(total > 0 || loading) && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Профилирование фолловеров
                </CardTitle>
                <CardDescription>{total} профилей</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleLaunchBrowser} disabled={browserRunning} className="gap-1.5">
                  {browserRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Chrome className="w-4 h-4" />}
                  Загрузить
                </Button>
                <ImportDialog onImported={fetchProfiles} />
                {total > 0 && (
                  <>
                    {lowCompleteness > 0 && (
                      <Button variant="outline" size="sm" onClick={() => setEnrichDialogOpen(true)} className="gap-1.5">
                        <Globe className="w-4 h-4" />
                        Обогатить
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={handleReprofileAll} disabled={reprofilingAll} className="gap-1.5">
                      {reprofilingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                      Переанализировать
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Search & filters */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                <input type="text" placeholder="Поиск по имени, username, bio..."
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border bg-background" />
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-1.5">
                <Filter className="w-4 h-4" />
                {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={fetchProfiles}><RefreshCw className="w-4 h-4" /></Button>
            </div>

            {showFilters && (
              <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-muted/30">
                <FilterSelect label="Сегмент" value={selectedSegment} onChange={setSelectedSegment} options={SEGMENT_LABELS} />
                <FilterSelect label="Intent" value={selectedIntent} onChange={setSelectedIntent} options={INTENT_LABELS} />
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Интерес:</span>
                  <input type="text" value={selectedInterest} onChange={(e) => setSelectedInterest(e.target.value)}
                    placeholder="напр. typography" className="px-2 py-1 text-xs rounded border bg-background w-32" />
                </div>
                {(selectedSegment || selectedInterest || selectedIntent) && (
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => {
                    setSelectedSegment(""); setSelectedInterest(""); setSelectedIntent("");
                  }}>Сбросить</Button>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Сортировка:</span>
              {[
                { id: "confidence", label: "Уверенность" },
                { id: "completeness", label: "Полнота" },
                { id: "recency", label: "Дата" },
                { id: "username", label: "Username" },
              ].map((s) => (
                <button key={s.id} onClick={() => toggleSort(s.id)}
                  className={`px-2 py-0.5 rounded cursor-pointer ${sortBy === s.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}>
                  {s.label}{sortBy === s.id && (sortOrder === "desc" ? " ↓" : " ↑")}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
            ) : (
              <ScrollArea className="max-h-[600px]">
                <div className="space-y-1">
                  {profiles.map((p) => (
                    <button key={p.id} onClick={() => setSelectedProfile(p)}
                      className="w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-colors flex items-center gap-3 cursor-pointer">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={p.profile_picture_url} />
                        <AvatarFallback className="text-xs">{p.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{p.display_name}</span>
                          <span className="text-xs text-muted-foreground">@{p.username}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{p.bio || "Нет био"}</p>
                      </div>
                      <div className="hidden md:flex items-center gap-1.5 shrink-0">
                        {p.inferred_segments.slice(0, 1).map((s) => (
                          <Badge key={s.tag} variant="secondary" className="text-xs">{SEGMENT_LABELS[s.tag] || s.tag}</Badge>
                        ))}
                        {p.inferred_interests.slice(0, 2).map((i) => (
                          <Badge key={i.tag} variant="outline" className="text-xs">{i.tag}</Badge>
                        ))}
                      </div>
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        <ConfidenceBadge value={p.confidence_scores.overall} />
                        <span className="text-xs text-muted-foreground">{Math.round(p.source_completeness_score * 100)}%</span>
                      </div>
                      <Eye className="w-4 h-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══════ Enrich Dialog ═══════ */}
      <Dialog open={enrichDialogOpen} onOpenChange={setEnrichDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Обогащение профилей</DialogTitle>
            <DialogDescription>Загрузка bio, аватаров и статистики для неполных профилей</DialogDescription>
          </DialogHeader>
          {enrichResult ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-600">
                <Check className="w-5 h-5" /><span className="font-medium">Готово</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <StatMini label="Обработано" value={enrichResult.total} />
                <StatMini label="Успешно" value={enrichResult.succeeded} />
                <StatMini label="Ошибки" value={enrichResult.failed} />
              </div>
              <Button variant="outline" className="w-full" onClick={() => { setEnrichResult(null); setEnrichDialogOpen(false); }}>Закрыть</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                {lowCompleteness} профилей с полнотой &lt;30% будут обогащены через scraping.
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Session ID (необязательно):</label>
                <input type="text" value={enrichSessionId} onChange={(e) => setEnrichSessionId(e.target.value)}
                  placeholder="sessionid" className="w-full px-3 py-1.5 text-xs rounded border bg-background font-mono" />
              </div>
              <Button className="w-full" onClick={handleEnrich} disabled={enriching}>
                {enriching ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Обогащаем...</>
                  : <><Globe className="w-4 h-4 mr-2" />Обогатить {lowCompleteness} профилей</>}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Components ──

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 60 ? "text-green-500" : pct >= 30 ? "text-yellow-500" : "text-red-500";
  return <span className={`text-xs font-mono font-medium ${color}`}>{pct}%</span>;
}

function StatMini({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-2 rounded bg-muted/50 text-center">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: Record<string, string>;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{label}:</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="px-2 py-1 text-xs rounded border bg-background">
        <option value="">Все</option>
        {Object.entries(options).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
    </div>
  );
}
