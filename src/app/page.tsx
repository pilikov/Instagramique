"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Instagram, ArrowRight, BarChart3, Image, MessageCircle, Eye } from "lucide-react";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("ig_access_token");
    if (token) {
      router.push("/dashboard");
    }
  }, [router]);

  const handleLogin = () => {
    const appId = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`;

    const authUrl =
      `https://api.instagram.com/oauth/authorize` +
      `?client_id=${appId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=instagram_business_basic%2Cinstagram_business_manage_comments%2Cinstagram_business_manage_insights%2Cinstagram_business_content_publish`;

    window.location.href = authUrl;
  };

  const features = [
    {
      icon: BarChart3,
      title: "Аналитика",
      desc: "Подробные инсайты вашего аккаунта: охват, просмотры, вовлечённость",
    },
    {
      icon: Image,
      title: "Медиа-контент",
      desc: "Все посты, рилзы, сториз и карусели в одном месте",
    },
    {
      icon: MessageCircle,
      title: "Комментарии",
      desc: "Управление и просмотр всех комментариев к вашим публикациям",
    },
    {
      icon: Eye,
      title: "Бизнес-данные",
      desc: "Данные Meta Business: демография аудитории, активности, охват",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Instagram className="w-4 h-4" />
            Instagram Graph API Dashboard
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            Instagramique
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Полный доступ к данным вашего Instagram-аккаунта через Meta Graph API.
            Посты, сториз, рилзы, комментарии и бизнес-аналитика.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((f) => (
            <Card key={f.title} className="bg-card/50 backdrop-blur border-border/50 hover:border-primary/30 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <f.icon className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{f.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">{f.desc}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handleLogin}
            className="text-lg px-8 py-6 gap-3 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:opacity-90 transition-opacity text-white border-0 cursor-pointer"
          >
            <Instagram className="w-6 h-6" />
            Войти через Instagram
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Используется официальный Meta Graph API. Требуется бизнес-аккаунт или аккаунт автора в Instagram.
        </p>
      </div>
    </div>
  );
}
