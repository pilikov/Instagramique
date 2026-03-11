import { NextRequest, NextResponse } from "next/server";
import {
  queryProfiles,
  getProfile,
  deleteProfile,
  getAllProfiles,
} from "@/lib/profiling/store";
import type { ProfileFilterParams } from "@/lib/profiling/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const profile = await getProfile(id);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    return NextResponse.json(profile);
  }

  const params: ProfileFilterParams = {
    search: searchParams.get("search") || undefined,
    interest: searchParams.get("interest") || undefined,
    segment: searchParams.get("segment") || undefined,
    intent: searchParams.get("intent") || undefined,
    commercial: searchParams.get("commercial") || undefined,
    min_confidence: searchParams.get("min_confidence")
      ? Number(searchParams.get("min_confidence"))
      : undefined,
    sort_by: (searchParams.get("sort_by") as ProfileFilterParams["sort_by"]) || "confidence",
    sort_order: (searchParams.get("sort_order") as ProfileFilterParams["sort_order"]) || "desc",
    limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : 50,
    offset: searchParams.get("offset") ? Number(searchParams.get("offset")) : 0,
  };

  try {
    const { profiles, total } = await queryProfiles(params);
    return NextResponse.json({
      data: profiles,
      total,
      limit: params.limit,
      offset: params.offset,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const deleted = await deleteProfile(id);
  if (!deleted) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
