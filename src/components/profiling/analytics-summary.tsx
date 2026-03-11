"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  BarChart3, Users, Target, Briefcase, Globe, TrendingUp,
  RefreshCw, Loader2, PieChart,
} from "lucide-react";
import type { AudienceAnalytics, TagCount } from "@/lib/profiling/types";

export function AnalyticsSummary() {
  const [analytics, setAnalytics] = useState<AudienceAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profiling/analytics");
      const data = await res.json();
      setAnalytics(data);
    } catch {
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!analytics || analytics.total_profiles === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <PieChart className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">Нет данных для аналитики</p>
          <p className="text-sm mt-1">Сначала импортируйте и профилируйте фолловеров</p>
        </CardContent>
      </Card>
    );
  }

  const a = analytics;

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Всего профилей" value={a.total_profiles} />
        <StatCard icon={Target} label="Профилировано" value={a.profiled_count} />
        <StatCard icon={TrendingUp} label="Ср. уверенность" value={`${Math.round(a.avg_confidence * 100)}%`} />
        <StatCard icon={BarChart3} label="Ср. полнота" value={`${Math.round(a.avg_completeness * 100)}%`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top interests */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4" />
              Топ интересов
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TagDistribution tags={a.top_interests.slice(0, 10)} />
          </CardContent>
        </Card>

        {/* Top segments */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4" />
              Сегменты аудитории
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TagDistribution tags={a.top_segments.slice(0, 10)} />
          </CardContent>
        </Card>

        {/* Intent distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Тип профилей
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TagDistribution tags={a.intent_distribution} />
          </CardContent>
        </Card>

        {/* Commercial distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Коммерческие сигналы
            </CardTitle>
          </CardHeader>
          <CardContent>
            {a.commercial_distribution.length > 0 ? (
              <TagDistribution tags={a.commercial_distribution} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Нет коммерческих сигналов
              </p>
            )}
          </CardContent>
        </Card>

        {/* Language */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Языки
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TagDistribution tags={a.language_distribution.slice(0, 8)} />
          </CardContent>
        </Card>

        {/* Geo */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="w-4 h-4" />
              География
            </CardTitle>
          </CardHeader>
          <CardContent>
            {a.geo_distribution.length > 0 ? (
              <TagDistribution tags={a.geo_distribution.slice(0, 8)} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Нет данных о локациях
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Clusters */}
      {a.high_confidence_clusters.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              Кластеры аудитории
            </CardTitle>
            <CardDescription>Топ сегменты с ключевыми интересами</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {a.high_confidence_clusters.map((cluster) => (
                <div key={cluster.label} className="p-3 rounded-lg bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{cluster.label}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {cluster.count} ({cluster.percentage}%)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {cluster.top_interests.map((interest) => (
                      <Badge key={interest} variant="outline" className="text-xs">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Ср. уверенность: {Math.round(cluster.avg_confidence * 100)}%
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={fetchAnalytics} className="gap-1.5">
          <RefreshCw className="w-4 h-4" />
          Обновить аналитику
        </Button>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
}) {
  return (
    <div className="p-3 rounded-lg bg-muted/50 text-center">
      <Icon className="w-4 h-4 mx-auto text-muted-foreground" />
      <p className="text-xl font-bold mt-1">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function TagDistribution({ tags }: { tags: TagCount[] }) {
  if (tags.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">Нет данных</p>;
  }

  const maxCount = Math.max(...tags.map((t) => t.count));

  return (
    <div className="space-y-1.5">
      {tags.map((tag) => (
        <div key={tag.tag} className="flex items-center gap-2">
          <span className="text-xs w-24 truncate shrink-0" title={tag.tag}>
            {tag.tag}
          </span>
          <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary/60 rounded-full"
              style={{ width: `${(tag.count / maxCount) * 100}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground w-14 text-right shrink-0">
            {tag.count} ({tag.percentage}%)
          </span>
        </div>
      ))}
    </div>
  );
}
