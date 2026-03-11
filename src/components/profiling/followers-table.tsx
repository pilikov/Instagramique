"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users, Search, Filter, RefreshCw, Loader2, ChevronDown, ChevronUp,
  ArrowUpDown, Eye, Zap,
} from "lucide-react";
import { ImportDialog } from "./import-dialog";
import { ProfileDetail } from "./profile-detail";
import type { FollowerProfile } from "@/lib/profiling/types";

interface ProfilesResponse {
  data: FollowerProfile[];
  total: number;
}

const SEGMENT_LABELS: Record<string, string> = {
  designer: "Дизайнер",
  founder: "Фаундер",
  developer: "Разработчик",
  creator: "Креатор",
  agency: "Агентство",
  "school/education": "Образование",
  local_business_owner: "Местный бизнес",
  athlete: "Атлет",
  parent: "Родитель",
  lifestyle_consumer: "Лайфстайл",
  "media/journalist": "Медиа/журналист",
  "recruiter/hr": "HR/Рекрутер",
  photographer: "Фотограф",
  marketer: "Маркетолог",
};

const INTENT_LABELS: Record<string, string> = {
  personal: "Личный",
  professional: "Проф.",
  creator: "Креатор",
  business: "Бизнес",
  mixed: "Смешанный",
};

export function FollowersTable() {
  const [profiles, setProfiles] = useState<FollowerProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSegment, setSelectedSegment] = useState<string>("");
  const [selectedInterest, setSelectedInterest] = useState<string>("");
  const [selectedIntent, setSelectedIntent] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("confidence");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedProfile, setSelectedProfile] = useState<FollowerProfile | null>(null);
  const [reprofilingAll, setReprofilingAll] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        sort_by: sortBy,
        sort_order: sortOrder,
        limit: "100",
      });
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

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

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
    if (sortBy === field) {
      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

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
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Профилирование фолловеров
              </CardTitle>
              <CardDescription>
                {total > 0 ? `${total} профилей` : "Нет данных — импортируйте фолловеров"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <ImportDialog onImported={fetchProfiles} />
              {total > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReprofileAll}
                  disabled={reprofilingAll}
                  className="gap-1.5"
                >
                  {reprofilingAll
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Zap className="w-4 h-4" />}
                  Перепрофилировать
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Search & filters */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Поиск по имени, username, bio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border bg-background"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-1.5"
            >
              <Filter className="w-4 h-4" />
              Фильтры
              {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={fetchProfiles}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-muted/30">
              <FilterSelect
                label="Сегмент"
                value={selectedSegment}
                onChange={setSelectedSegment}
                options={SEGMENT_LABELS}
              />
              <FilterSelect
                label="Intent"
                value={selectedIntent}
                onChange={setSelectedIntent}
                options={INTENT_LABELS}
              />
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Интерес:</span>
                <input
                  type="text"
                  value={selectedInterest}
                  onChange={(e) => setSelectedInterest(e.target.value)}
                  placeholder="напр. typography"
                  className="px-2 py-1 text-xs rounded border bg-background w-32"
                />
              </div>
              {(selectedSegment || selectedInterest || selectedIntent) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setSelectedSegment("");
                    setSelectedInterest("");
                    setSelectedIntent("");
                  }}
                >
                  Сбросить
                </Button>
              )}
            </div>
          )}

          {/* Sort bar */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Сортировка:</span>
            {[
              { id: "confidence", label: "Уверенность" },
              { id: "completeness", label: "Полнота" },
              { id: "recency", label: "Дата" },
              { id: "username", label: "Username" },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => toggleSort(s.id)}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  sortBy === s.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                }`}
              >
                {s.label}
                {sortBy === s.id && (
                  sortOrder === "desc" ? " ↓" : " ↑"
                )}
              </button>
            ))}
          </div>

          {/* Table */}
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Нет профилей</p>
              <p className="text-sm mt-1">
                Импортируйте CSV/JSON с фолловерами или добавьте юзернеймы
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-[600px]">
              <div className="space-y-1">
                {profiles.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProfile(p)}
                    className="w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-colors flex items-center gap-3 cursor-pointer"
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={p.profile_picture_url} />
                      <AvatarFallback className="text-xs">
                        {p.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{p.display_name}</span>
                        <span className="text-xs text-muted-foreground">@{p.username}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {p.bio || "Нет био"}
                      </p>
                    </div>

                    <div className="hidden md:flex items-center gap-1.5 shrink-0">
                      {p.inferred_segments.slice(0, 1).map((s) => (
                        <Badge key={s.tag} variant="secondary" className="text-xs">
                          {SEGMENT_LABELS[s.tag] || s.tag}
                        </Badge>
                      ))}
                      {p.inferred_interests.slice(0, 2).map((i) => (
                        <Badge key={i.tag} variant="outline" className="text-xs">
                          {i.tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <ConfidenceBadge value={p.confidence_scores.overall} />
                      <span className="text-xs text-muted-foreground">
                        {Math.round(p.source_completeness_score * 100)}%
                      </span>
                    </div>

                    <Eye className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  let color = "text-red-500";
  if (pct >= 60) color = "text-green-500";
  else if (pct >= 30) color = "text-yellow-500";

  return (
    <span className={`text-xs font-mono font-medium ${color}`}>
      {pct}%
    </span>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Record<string, string>;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-2 py-1 text-xs rounded border bg-background"
      >
        <option value="">Все</option>
        {Object.entries(options).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
    </div>
  );
}
