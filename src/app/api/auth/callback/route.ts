import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    const msg = errorDescription || error;
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(msg)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL("/?error=no_code", request.url));
  }

  try {
    const appId = process.env.INSTAGRAM_APP_ID!;
    const appSecret = process.env.INSTAGRAM_APP_SECRET!;
    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`;

    // 1. Exchange code for short-lived token via Instagram Login
    const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code,
      }),
    });
    const tokenData = await tokenRes.json();

    if (tokenData.error_type || tokenData.error_message) {
      const msg = tokenData.error_message || tokenData.error_type || "Token error";
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent(msg)}`, request.url)
      );
    }

    if (!tokenData.access_token) {
      return NextResponse.redirect(
        new URL(
          `/?error=${encodeURIComponent("Не удалось получить токен: " + JSON.stringify(tokenData))}`,
          request.url
        )
      );
    }

    const shortToken = tokenData.access_token;
    const userId = tokenData.user_id;

    // 2. Exchange for long-lived token
    const longRes = await fetch(
      `https://graph.instagram.com/access_token` +
        `?grant_type=ig_exchange_token` +
        `&client_secret=${appSecret}` +
        `&access_token=${shortToken}`
    );
    const longData = await longRes.json();
    const accessToken = longData.access_token || shortToken;

    const redirectUrl = new URL("/auth/success", request.url);
    redirectUrl.searchParams.set("token", accessToken);
    if (userId) {
      redirectUrl.searchParams.set("user_id", String(userId));
    }

    return NextResponse.redirect(redirectUrl);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(message)}`, request.url)
    );
  }
}
