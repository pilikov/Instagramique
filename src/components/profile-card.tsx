"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { InstagramProfile } from "@/lib/types";
import { ExternalLink, Globe, Users, UserCheck, ImageIcon } from "lucide-react";

interface ProfileCardProps {
  profile: InstagramProfile | null;
  loading: boolean;
}

export function ProfileCard({ profile, loading }: ProfileCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <Skeleton className="w-20 h-20 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-60" />
          </div>
        </CardHeader>
      </Card>
    );
  }

  if (!profile) return null;

  const stats = [
    { label: "Публикации", value: profile.media_count, icon: ImageIcon },
    { label: "Подписчики", value: profile.followers_count, icon: Users },
    { label: "Подписки", value: profile.follows_count, icon: UserCheck },
  ];

  return (
    <Card className="overflow-hidden">
      <div className="h-24 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737]" />
      <CardHeader className="-mt-12 pb-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
          <Avatar className="w-24 h-24 border-4 border-background shadow-xl">
            <AvatarImage src={profile.profile_picture_url} alt={profile.username} />
            <AvatarFallback className="text-2xl font-bold">
              {profile.username?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-bold">{profile.name || profile.username}</h2>
              <Badge variant="secondary" className="text-xs">
                {profile.account_type}
              </Badge>
            </div>
            <p className="text-muted-foreground">@{profile.username}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {profile.biography && (
          <p className="text-sm whitespace-pre-wrap">{profile.biography}</p>
        )}
        {profile.website && (
          <a
            href={profile.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <Globe className="w-3.5 h-3.5" />
            {profile.website}
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
        <Separator />
        <div className="grid grid-cols-3 gap-4 text-center">
          {stats.map((stat) => (
            <div key={stat.label} className="space-y-1">
              <div className="flex items-center justify-center gap-1.5">
                <stat.icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold">
                {stat.value != null ? formatNumber(stat.value) : "—"}
              </p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toString();
}
