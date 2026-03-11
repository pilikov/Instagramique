"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
  Eye, Zap, Download, Globe, Check, AlertCircle, Copy, FileText, Terminal,
} from "lucide-react";
import { ImportDialog } from "./import-dialog";
import { ProfileDetail } from "./profile-detail";
import type { FollowerProfile } from "@/lib/profiling/types";

interface ProfilesResponse {
  data: FollowerProfile[];
  total: number;
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

function buildFetchScript(appUrl: string): string {
  return `(async()=>{
  /* Instagramique — загрузка подписчиков */
  const APP = '${appUrl}';
  const r0 = await fetch('/api/v1/accounts/current_user/?edit=true');
  if (!r0.ok) { console.error('❌ Не удалось получить данные аккаунта. Вы залогинены?'); return; }
  const me = (await r0.json()).user;
  console.log('👤 ' + me.username + ' (id: ' + me.pk + ')');

  const followers = [];
  let maxId = null, hasMore = true, page = 0;

  while (hasMore) {
    const q = new URLSearchParams({count:'50',search_surface:'follow_list_page'});
    if (maxId) q.set('max_id', maxId);
    const r = await fetch('/api/v1/friendships/' + me.pk + '/followers/?' + q);
    if (!r.ok) { console.error('❌ HTTP ' + r.status); break; }
    const d = await r.json();
    for (const u of (d.users || [])) {
      followers.push({
        username: u.username, full_name: u.full_name || '',
        profile_picture_url: u.profile_pic_url || '',
        is_verified: !!u.is_verified, is_private: !!u.is_private
      });
    }
    hasMore = d.has_more && d.next_max_id;
    maxId = d.next_max_id;
    console.log('📄 Стр. ' + (++page) + ': ' + followers.length + ' подписчиков');
    if (hasMore) await new Promise(r => setTimeout(r, 2000));
  }

  /* Отправляем напрямую в приложение */
  try {
    const r = await fetch(APP + '/api/profiling/import', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(followers), mode:'cors'
    });
    if (r.ok) { console.log('✅ Готово! ' + followers.length + ' подписчиков отправлены в Instagramique.'); return; }
  } catch(e) { console.log('⚠️ Прямая отправка не удалась, скачиваем файл...'); }

  /* Фоллбэк — скачиваем файл */
  const blob = new Blob([JSON.stringify(followers, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'followers_' + me.username + '_' + followers.length + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  console.log('📥 Файл скачан! Загрузите его в Instagramique через кнопку «Импорт».');
})();`;
}

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

  const [fetchDialogOpen, setFetchDialogOpen] = useState(false);
  const [fetchTab, setFetchTab] = useState<"script" | "upload">("script");
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ imported: number; failed: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [enrichDialogOpen, setEnrichDialogOpen] = useState(false);
  const [enrichSessionId, setEnrichSessionId] = useState("");
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<{ total: number; succeeded: number; failed: number } | null>(null);

  const appUrl = useMemo(() =>
    typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
  []);
  const script = useMemo(() => buildFetchScript(appUrl), [appUrl]);

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

  // Auto-refresh: if dialog is open, poll for new data in case the script POSTs directly
  useEffect(() => {
    if (!fetchDialogOpen) return;
    const iv = setInterval(() => { fetchProfiles(); }, 5000);
    return () => clearInterval(iv);
  }, [fetchDialogOpen, fetchProfiles]);

  const handleCopyScript = async () => {
    await navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleFileUpload = async (file: File) => {
    setUploadLoading(true);
    setUploadError(null);
    setUploadResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/profiling/import", { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) setUploadError(data.error);
      else {
        setUploadResult({ imported: data.imported, failed: data.failed });
        fetchProfiles();
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleEnrich = async () => {
    setEnriching(true);
    setEnrichResult(null);
    try {
      const res = await fetch("/api/profiling/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "enrich_all",
          session_id: enrichSessionId.trim() || undefined,
          delay_ms: 2000,
        }),
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
      {/* ── Empty state ── */}
      {!loading && total === 0 && (
        <Card className="border-primary/20">
          <CardContent className="py-10">
            <div className="text-center space-y-4 max-w-md mx-auto">
              <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto">
                <Users className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Загрузите своих подписчиков</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Скрипт автоматически скачает список подписчиков из Instagram
                  и отправит его в приложение для анализа
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button size="lg" onClick={() => setFetchDialogOpen(true)} className="gap-2">
                  <Terminal className="w-5 h-5" />
                  Загрузить подписчиков
                </Button>
                <ImportDialog onImported={fetchProfiles} />
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
                  <p className="text-sm font-medium">
                    {lowCompleteness} из {total} профилей содержат только юзернейм
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Обогатите данные — скрейпер загрузит bio, аватарки и статистику
                  </p>
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

      {/* ── Main card ── */}
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
                <Button variant="outline" size="sm" onClick={() => setFetchDialogOpen(true)} className="gap-1.5">
                  <Terminal className="w-4 h-4" />
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
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                <input
                  type="text" placeholder="Поиск по имени, username, bio..."
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border bg-background"
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-1.5">
                <Filter className="w-4 h-4" />
                {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={fetchProfiles}>
                <RefreshCw className="w-4 h-4" />
              </Button>
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
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
              </div>
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

      {/* ═══════ Fetch Followers Dialog ═══════ */}
      <Dialog open={fetchDialogOpen} onOpenChange={(v) => {
        setFetchDialogOpen(v);
        if (!v) { setUploadResult(null); setUploadError(null); }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Terminal className="w-5 h-5" />
              Загрузить подписчиков
            </DialogTitle>
            <DialogDescription>
              Скрипт работает прямо в вашем браузере — используя вашу сессию Instagram
            </DialogDescription>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex gap-1">
            <Button variant={fetchTab === "script" ? "default" : "outline"} size="sm"
              onClick={() => setFetchTab("script")} className="text-xs gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              Скрипт
            </Button>
            <Button variant={fetchTab === "upload" ? "default" : "outline"} size="sm"
              onClick={() => setFetchTab("upload")} className="text-xs gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Загрузить файл
            </Button>
          </div>

          {fetchTab === "script" && (
            <div className="space-y-3">
              {/* Instructions */}
              <div className="space-y-2">
                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/40">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">1</div>
                  <div className="text-sm">
                    <p className="font-medium">Скопируйте скрипт</p>
                    <p className="text-xs text-muted-foreground">Нажмите кнопку ниже</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/40">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">2</div>
                  <div className="text-sm">
                    <p className="font-medium">Откройте консоль на Instagram</p>
                    <p className="text-xs text-muted-foreground">
                      Перейдите на <a href="https://www.instagram.com" target="_blank" rel="noopener"
                        className="text-primary hover:underline">instagram.com</a>
                      {" → "}<kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">F12</kbd>
                      {" → вкладка "}<strong>Console</strong>
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/40">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">3</div>
                  <div className="text-sm">
                    <p className="font-medium">Вставьте и запустите</p>
                    <p className="text-xs text-muted-foreground">
                      <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Ctrl+V</kbd> → <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Enter</kbd>
                      {" — данные отправятся автоматически"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Copy button */}
              <Button className="w-full gap-2" onClick={handleCopyScript}>
                {copied ? (
                  <><Check className="w-4 h-4" />Скопировано!</>
                ) : (
                  <><Copy className="w-4 h-4" />Скопировать скрипт</>
                )}
              </Button>

              {/* Script preview */}
              <details className="group">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                  Показать скрипт
                </summary>
                <pre className="mt-2 p-3 rounded-lg bg-muted/50 text-[10px] leading-relaxed font-mono overflow-auto max-h-48 whitespace-pre-wrap break-all">
                  {script}
                </pre>
              </details>

              {/* How it works */}
              <div className="p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Как это работает:</p>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li>Скрипт запускается на instagram.com — внутри вашей авторизованной сессии</li>
                  <li>Использует тот же API, что и сам Instagram при показе списка подписчиков</li>
                  <li>Загружает порциями по 50, с паузой 2 сек между страницами</li>
                  <li>Данные отправляются напрямую сюда в приложение</li>
                  <li>Если прямая отправка не сработает — скачается JSON файл</li>
                </ul>
              </div>
            </div>
          )}

          {fetchTab === "upload" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Если скрипт скачал файл вместо прямой отправки — загрузите его здесь:
              </p>

              {uploadResult ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-600">
                    <Check className="w-5 h-5" />
                    <span className="font-medium">Импортировано: {uploadResult.imported}</span>
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => {
                    setUploadResult(null);
                    setFetchDialogOpen(false);
                  }}>Готово</Button>
                </div>
              ) : (
                <>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <input ref={fileInputRef} type="file" accept=".json" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
                    {uploadLoading ? (
                      <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <FileText className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Загрузите followers_*.json</p>
                        <p className="text-xs text-muted-foreground mt-1">Файл, скачанный скриптом</p>
                      </>
                    )}
                  </div>
                  {uploadError && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{uploadError}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════ Enrich Dialog ═══════ */}
      <Dialog open={enrichDialogOpen} onOpenChange={setEnrichDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Обогащение профилей</DialogTitle>
            <DialogDescription>
              Загрузка bio, аватаров и статистики для неполных профилей
            </DialogDescription>
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
              <Button variant="outline" className="w-full" onClick={() => { setEnrichResult(null); setEnrichDialogOpen(false); }}>
                Закрыть
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                <p>{lowCompleteness} профилей с полнотой &lt;30% будут обогащены через scraping.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Session ID (необязательно, для лучших результатов):</label>
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

// ── Small components ──

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
