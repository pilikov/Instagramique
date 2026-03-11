import { NextRequest, NextResponse } from "next/server";

const GRAPH_API = "https://graph.instagram.com/v21.0";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accessToken = request.headers.get("Authorization")?.replace("Bearer ", "");
  const endpoint = searchParams.get("endpoint");
  const userId = searchParams.get("user_id");

  if (!accessToken) {
    return NextResponse.json({ error: "No access token" }, { status: 401 });
  }

  try {
    let url = "";
    const id = userId || "me";

    switch (endpoint) {
      case "profile":
        url = `${GRAPH_API}/${id}?fields=id,username,name,account_type,profile_picture_url,biography,website,followers_count,follows_count,media_count&access_token=${accessToken}`;
        break;

      case "media": {
        const limit = searchParams.get("limit") || "50";
        const after = searchParams.get("after");
        url = `${GRAPH_API}/${id}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,children{media_url,media_type}&limit=${limit}&access_token=${accessToken}`;
        if (after) url += `&after=${after}`;
        break;
      }

      case "stories":
        url = `${GRAPH_API}/${id}/stories?fields=id,media_type,media_url,timestamp,caption&access_token=${accessToken}`;
        break;

      case "comments": {
        const mediaId = searchParams.get("media_id");
        if (!mediaId) {
          return NextResponse.json({ error: "media_id required" }, { status: 400 });
        }
        url = `${GRAPH_API}/${mediaId}/comments?fields=id,text,username,timestamp,like_count,replies{id,text,username,timestamp}&access_token=${accessToken}`;
        break;
      }

      case "media_insights": {
        const insightMediaId = searchParams.get("media_id");
        if (!insightMediaId) {
          return NextResponse.json({ error: "media_id required" }, { status: 400 });
        }
        url = `${GRAPH_API}/${insightMediaId}/insights?metric=impressions,reach,saved,views,likes,comments,shares,plays,total_interactions&access_token=${accessToken}`;
        break;
      }

      case "user_insights": {
        const period = searchParams.get("period") || "day";
        const since = searchParams.get("since");
        const until = searchParams.get("until");
        let metricsUrl = `${GRAPH_API}/${id}/insights?metric=impressions,reach,profile_views,accounts_engaged,total_interactions&period=${period}&access_token=${accessToken}`;
        if (since) metricsUrl += `&since=${since}`;
        if (until) metricsUrl += `&until=${until}`;
        url = metricsUrl;
        break;
      }

      case "tags":
        url = `${GRAPH_API}/${id}/tags?fields=id,caption,media_type,media_url,timestamp,permalink&access_token=${accessToken}`;
        break;

      case "live_media":
        url = `${GRAPH_API}/${id}/live_media?fields=id,media_type,timestamp,permalink&access_token=${accessToken}`;
        break;

      default:
        return NextResponse.json({ error: "Unknown endpoint" }, { status: 400 });
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      return NextResponse.json(
        { error: data.error.message, code: data.error.code },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
