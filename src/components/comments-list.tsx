"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { InstagramMedia, InstagramComment } from "@/lib/types";
import { MessageCircle, Heart, Clock, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

interface CommentsListProps {
  media: InstagramMedia[];
  loading: boolean;
}

export function CommentsList({ media, loading }: CommentsListProps) {
  const [comments, setComments] = useState<Record<string, InstagramComment[]>>({});
  const [commentErrors, setCommentErrors] = useState<Record<string, string>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [expandedMedia, setExpandedMedia] = useState<string[]>([]);

  const postsWithComments = media.filter((m) => m.comments_count && m.comments_count > 0);

  const loadComments = useCallback(async (mediaId: string) => {
    if (comments[mediaId] || commentErrors[mediaId]) {
      setExpandedMedia((prev) =>
        prev.includes(mediaId) ? prev.filter((id) => id !== mediaId) : [...prev, mediaId]
      );
      return;
    }

    const token = localStorage.getItem("ig_access_token");
    if (!token) return;

    setLoadingComments((prev) => ({ ...prev, [mediaId]: true }));

    try {
      const res = await fetch(`/api/instagram?endpoint=comments&media_id=${mediaId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.error) {
        setCommentErrors((prev) => ({ ...prev, [mediaId]: data.error }));
        setExpandedMedia((prev) => [...prev, mediaId]);
      } else if (data.data) {
        setComments((prev) => ({ ...prev, [mediaId]: data.data }));
        setExpandedMedia((prev) => [...prev, mediaId]);
      }
    } catch (err) {
      setCommentErrors((prev) => ({
        ...prev,
        [mediaId]: err instanceof Error ? err.message : "Ошибка загрузки",
      }));
      setExpandedMedia((prev) => [...prev, mediaId]);
    } finally {
      setLoadingComments((prev) => ({ ...prev, [mediaId]: false }));
    }
  }, [comments, commentErrors]);

  useEffect(() => {
    if (postsWithComments.length > 0) {
      postsWithComments.slice(0, 3).forEach((p) => loadComments(p.id));
    }
  }, [media.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Комментарии</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Комментарии
        </CardTitle>
        <CardDescription>
          {postsWithComments.length} публикаций с комментариями
        </CardDescription>
      </CardHeader>
      <CardContent>
        {postsWithComments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>Нет комментариев</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[600px]">
            <div className="space-y-3">
              {postsWithComments.slice(0, 20).map((post) => (
                <div key={post.id} className="border rounded-lg p-3">
                  <button
                    onClick={() => loadComments(post.id)}
                    className="w-full text-left flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">
                        {post.caption?.slice(0, 80) || "Без подписи"}
                        {post.caption && post.caption.length > 80 ? "..." : ""}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" /> {post.comments_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {new Date(post.timestamp).toLocaleDateString("ru-RU")}
                        </span>
                      </div>
                    </div>
                    {loadingComments[post.id] ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : expandedMedia.includes(post.id) ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  {expandedMedia.includes(post.id) && commentErrors[post.id] && (
                    <div className="mt-3 p-2 rounded bg-destructive/10 text-destructive text-xs">
                      Ошибка: {commentErrors[post.id]}
                    </div>
                  )}

                  {expandedMedia.includes(post.id) && comments[post.id] && (
                    <div className="mt-3 space-y-2 pl-2 border-l-2 border-primary/20">
                      {comments[post.id].length === 0 && (
                        <p className="text-xs text-muted-foreground py-1">Комментарии не найдены</p>
                      )}
                      {comments[post.id].map((comment) => (
                        <div key={comment.id} className="py-2">
                          <div className="flex items-start gap-2">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="text-xs">
                                {comment.username?.slice(0, 1).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">@{comment.username}</span>
                                {comment.like_count != null && comment.like_count > 0 && (
                                  <Badge variant="outline" className="text-xs px-1 py-0">
                                    <Heart className="w-2.5 h-2.5 mr-0.5" /> {comment.like_count}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-0.5">{comment.text}</p>
                              <span className="text-xs text-muted-foreground">
                                {new Date(comment.timestamp).toLocaleString("ru-RU")}
                              </span>

                              {comment.replies?.data && comment.replies.data.length > 0 && (
                                <div className="mt-2 ml-4 space-y-2 border-l border-muted pl-3">
                                  {comment.replies.data.map((reply) => (
                                    <div key={reply.id} className="py-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-medium">@{reply.username}</span>
                                      </div>
                                      <p className="text-xs text-muted-foreground">{reply.text}</p>
                                      <span className="text-xs text-muted-foreground/70">
                                        {new Date(reply.timestamp).toLocaleString("ru-RU")}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
