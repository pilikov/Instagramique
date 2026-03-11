"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft, ExternalLink, Globe, Users, UserCheck, ImageIcon,
  Zap, Loader2, ChevronDown, ChevronUp, MapPin, Languages,
} from "lucide-react";
import type { FollowerProfile, InferenceTag } from "@/lib/profiling/types";

interface ProfileDetailProps {
  profile: FollowerProfile;
  onBack: () => void;
}

export function ProfileDetail({ profile, onBack }: ProfileDetailProps) {
  const [reprofiling, setReprofiling] = useState(false);
  const [currentProfile, setCurrentProfile] = useState(profile);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["interests", "segments"])
  );

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const handleReprofile = async () => {
    setReprofiling(true);
    try {
      const token = localStorage.getItem("ig_access_token");
      const res = await fetch("/api/profiling/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: "profile_one",
          username: currentProfile.username,
          raw_data: currentProfile.raw_payload,
        }),
      });
      const data = await res.json();
      if (data.profile) {
        setCurrentProfile(data.profile);
      }
    } finally {
      setReprofiling(false);
    }
  };

  const p = currentProfile;
  const stats = [
    { label: "Подписчики", value: p.profile_stats.followers_count, icon: Users },
    { label: "Подписки", value: p.profile_stats.follows_count, icon: UserCheck },
    { label: "Посты", value: p.profile_stats.media_count, icon: ImageIcon },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          Назад
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReprofile}
          disabled={reprofiling}
          className="gap-1.5 ml-auto"
        >
          {reprofiling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          Перепрофилировать
        </Button>
      </div>

      {/* Header card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={p.profile_picture_url} />
              <AvatarFallback className="text-lg">{p.username.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold">{p.display_name}</h2>
                <span className="text-muted-foreground">@{p.username}</span>
                {p.account_type && <Badge variant="secondary" className="text-xs">{p.account_type}</Badge>}
                {p.category && <Badge variant="outline" className="text-xs">{p.category}</Badge>}
              </div>
              {p.bio && <p className="text-sm whitespace-pre-wrap">{p.bio}</p>}
              <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                {p.external_url && (
                  <a
                    href={p.external_url.startsWith("http") ? p.external_url : `https://${p.external_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    {p.external_url}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {p.detected_language !== "unknown" && (
                  <span className="inline-flex items-center gap-1">
                    <Languages className="w-3.5 h-3.5" />
                    {p.detected_language.toUpperCase()}
                  </span>
                )}
                {p.inferred_geo.length > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {p.inferred_geo[0].tag}
                  </span>
                )}
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="grid grid-cols-3 gap-4 text-center">
            {stats.map((s) => (
              <div key={s.label}>
                <s.icon className="w-4 h-4 mx-auto text-muted-foreground" />
                <p className="text-lg font-bold mt-1">
                  {s.value != null ? formatNum(s.value) : "—"}
                </p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ScoreCard label="Уверенность" value={p.confidence_scores.overall} />
            <ScoreCard label="Полнота данных" value={p.source_completeness_score} />
            <ScoreCard label="Инт. оценка" value={p.confidence_scores.interests} />
            <ScoreCard label="Сегм. оценка" value={p.confidence_scores.segments} />
          </div>
        </CardContent>
      </Card>

      {/* Inference sections */}
      <InferenceSection
        title="Интересы"
        tags={p.inferred_interests}
        expanded={expandedSections.has("interests")}
        onToggle={() => toggleSection("interests")}
      />
      <InferenceSection
        title="Сегменты аудитории"
        tags={p.inferred_segments}
        expanded={expandedSections.has("segments")}
        onToggle={() => toggleSection("segments")}
      />
      <InferenceSection
        title="Намерение профиля"
        tags={p.inferred_intent}
        expanded={expandedSections.has("intent")}
        onToggle={() => toggleSection("intent")}
      />
      <InferenceSection
        title="Коммерческие сигналы"
        tags={p.inferred_commercial}
        expanded={expandedSections.has("commercial")}
        onToggle={() => toggleSection("commercial")}
      />
      <InferenceSection
        title="Геолокация"
        tags={p.inferred_geo}
        expanded={expandedSections.has("geo")}
        onToggle={() => toggleSection("geo")}
      />

      {/* Raw signals */}
      <Card>
        <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleSection("raw")}>
          <CardTitle className="text-sm flex items-center justify-between">
            Извлечённые сигналы
            {expandedSections.has("raw") ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </CardTitle>
        </CardHeader>
        {expandedSections.has("raw") && (
          <CardContent className="space-y-2 text-xs">
            {p.extracted_keywords.length > 0 && (
              <div>
                <span className="font-medium">Ключевые слова: </span>
                {p.extracted_keywords.map((k) => (
                  <Badge key={k} variant="outline" className="text-xs mr-1 mb-1">{k}</Badge>
                ))}
              </div>
            )}
            {p.extracted_hashtags.length > 0 && (
              <div>
                <span className="font-medium">Хэштеги: </span>
                {p.extracted_hashtags.map((h) => (
                  <Badge key={h} variant="outline" className="text-xs mr-1 mb-1">#{h}</Badge>
                ))}
              </div>
            )}
            {p.extracted_emojis.length > 0 && (
              <div>
                <span className="font-medium">Эмодзи: </span>
                <span>{p.extracted_emojis.join(" ")}</span>
              </div>
            )}
            <div>
              <span className="font-medium">Версия профиля: </span>{p.profile_version}
            </div>
            <div>
              <span className="font-medium">Последнее профилирование: </span>
              {new Date(p.last_profiled_at).toLocaleString("ru-RU")}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

function InferenceSection({
  title,
  tags,
  expanded,
  onToggle,
}: {
  title: string;
  tags: InferenceTag[];
  expanded: boolean;
  onToggle: () => void;
}) {
  if (tags.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2 cursor-pointer" onClick={onToggle}>
        <CardTitle className="text-sm flex items-center justify-between">
          <span>
            {title}
            <Badge variant="secondary" className="ml-2 text-xs">{tags.length}</Badge>
          </span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </CardTitle>
      </CardHeader>
      {expanded && (
        <CardContent>
          <div className="space-y-2">
            {tags.map((tag) => (
              <TagCard key={tag.tag} tag={tag} />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function TagCard({ tag }: { tag: InferenceTag }) {
  const [showEvidence, setShowEvidence] = useState(false);
  const pct = Math.round(tag.confidence * 100);

  return (
    <div className="p-2.5 rounded-lg bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-medium">{tag.tag}</Badge>
          <ConfidenceBar value={tag.confidence} />
          <span className="text-xs text-muted-foreground">{pct}%</span>
        </div>
        <button
          onClick={() => setShowEvidence(!showEvidence)}
          className="text-xs text-primary hover:underline cursor-pointer"
        >
          {showEvidence ? "Скрыть" : "Доказательства"}
        </button>
      </div>
      {showEvidence && (
        <div className="mt-2 space-y-1">
          {tag.evidence.map((e, i) => (
            <p key={i} className="text-xs text-muted-foreground pl-2 border-l-2 border-primary/20">
              {e}
            </p>
          ))}
          <p className="text-xs text-muted-foreground mt-1">
            <span className="font-medium">Источники: </span>
            {tag.source_fields.join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  let color = "bg-red-400";
  if (value >= 0.6) color = "bg-green-400";
  else if (value >= 0.3) color = "bg-yellow-400";

  return (
    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${value * 100}%` }} />
    </div>
  );
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  let color = "text-red-500";
  if (pct >= 60) color = "text-green-500";
  else if (pct >= 30) color = "text-yellow-500";

  return (
    <div className="p-2 rounded-lg bg-muted/50 text-center">
      <p className={`text-lg font-bold ${color}`}>{pct}%</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}
