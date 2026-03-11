"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { InstagramMedia } from "@/lib/types";
import {
  Heart, MessageCircle, ExternalLink, Play, ImageIcon,
  Layers, Film, Clock, ChevronLeft, ChevronRight, Loader2
} from "lucide-react";

interface MediaGridProps {
  media: InstagramMedia[];
  loading: boolean;
  title: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  showFilter?: boolean;
}

const mediaTypeIcons: Record<string, typeof ImageIcon> = {
  IMAGE: ImageIcon,
  VIDEO: Play,
  CAROUSEL_ALBUM: Layers,
  REEL: Film,
  STORY: Clock,
};

const mediaTypeLabels: Record<string, string> = {
  IMAGE: "Фото",
  VIDEO: "Видео",
  CAROUSEL_ALBUM: "Карусель",
  REEL: "Рилз",
  STORY: "Сториз",
};

export function MediaGrid({ media, loading, title, onLoadMore, hasMore, loadingMore, showFilter = true }: MediaGridProps) {
  const [selected, setSelected] = useState<InstagramMedia | null>(null);
  const [filter, setFilter] = useState<string>("ALL");
  const [carouselIndex, setCarouselIndex] = useState(0);

  const filtered = filter === "ALL" ? media : media.filter((m) => m.media_type === filter);

  const mediaTypes = ["ALL", ...Array.from(new Set(media.map((m) => m.media_type)))];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{filtered.length} элементов</CardDescription>
            </div>
            {showFilter && (
              <div className="flex gap-1.5 flex-wrap">
                {mediaTypes.map((type) => (
                  <Button
                    key={type}
                    variant={filter === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilter(type)}
                    className="text-xs"
                  >
                    {type === "ALL" ? "Все" : mediaTypeLabels[type] || type}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Нет медиа-контента</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filtered.map((item) => {
                  const Icon = mediaTypeIcons[item.media_type] || ImageIcon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setSelected(item); setCarouselIndex(0); }}
                      className="group relative aspect-square overflow-hidden rounded-lg bg-muted cursor-pointer border border-border/50 hover:border-primary/50 transition-colors"
                    >
                      {(item.media_url || item.thumbnail_url) && (
                        <Image
                          src={item.thumbnail_url || item.media_url!}
                          alt={item.caption?.slice(0, 100) || "Media"}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 768px) 50vw, 25vw"
                          unoptimized
                        />
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="flex items-center gap-4 text-white text-sm font-medium">
                          {item.like_count != null && (
                            <span className="flex items-center gap-1">
                              <Heart className="w-4 h-4" /> {item.like_count}
                            </span>
                          )}
                          {item.comments_count != null && (
                            <span className="flex items-center gap-1">
                              <MessageCircle className="w-4 h-4" /> {item.comments_count}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-black/60 text-white border-0">
                          <Icon className="w-3 h-3" />
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
              {hasMore && onLoadMore && (
                <div className="flex justify-center mt-6">
                  <Button variant="outline" onClick={onLoadMore} disabled={loadingMore}>
                    {loadingMore ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Загрузить ещё
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {(() => { const I = mediaTypeIcons[selected.media_type] || ImageIcon; return <I className="w-5 h-5" />; })()}
                  {mediaTypeLabels[selected.media_type] || selected.media_type}
                  <span className="text-muted-foreground font-normal text-sm ml-auto">
                    {new Date(selected.timestamp).toLocaleString("ru-RU")}
                  </span>
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[70vh]">
                <div className="space-y-4">
                  {selected.media_type === "CAROUSEL_ALBUM" && selected.children?.data ? (
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                      <Image
                        src={selected.children.data[carouselIndex]?.media_url || selected.media_url || ""}
                        alt="Carousel item"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      {selected.children.data.length > 1 && (
                        <>
                          <Button
                            size="icon"
                            variant="secondary"
                            className="absolute left-2 top-1/2 -translate-y-1/2 opacity-80"
                            onClick={() => setCarouselIndex(Math.max(0, carouselIndex - 1))}
                            disabled={carouselIndex === 0}
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="secondary"
                            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-80"
                            onClick={() => setCarouselIndex(Math.min(selected.children!.data.length - 1, carouselIndex + 1))}
                            disabled={carouselIndex === selected.children!.data.length - 1}
                          >
                            <ChevronRight className="w-5 h-5" />
                          </Button>
                          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                            {selected.children.data.map((_, i) => (
                              <span key={i} className={`w-2 h-2 rounded-full ${i === carouselIndex ? "bg-white" : "bg-white/50"}`} />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  ) : selected.media_type === "VIDEO" || selected.media_type === "REEL" ? (
                    <video
                      src={selected.media_url}
                      controls
                      className="w-full rounded-lg"
                      poster={selected.thumbnail_url}
                    />
                  ) : (
                    selected.media_url && (
                      <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                        <Image
                          src={selected.media_url}
                          alt={selected.caption?.slice(0, 100) || "Media"}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    )
                  )}

                  <div className="flex items-center gap-4 text-sm">
                    {selected.like_count != null && (
                      <span className="flex items-center gap-1.5">
                        <Heart className="w-4 h-4 text-red-500" /> {selected.like_count} лайков
                      </span>
                    )}
                    {selected.comments_count != null && (
                      <span className="flex items-center gap-1.5">
                        <MessageCircle className="w-4 h-4 text-blue-500" /> {selected.comments_count} комментариев
                      </span>
                    )}
                    {selected.permalink && (
                      <a
                        href={selected.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto flex items-center gap-1 text-primary hover:underline"
                      >
                        Открыть <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  {selected.caption && (
                    <>
                      <Separator />
                      <p className="text-sm whitespace-pre-wrap">{selected.caption}</p>
                    </>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
