import { NextResponse } from "next/server";
import { computeAnalytics } from "@/lib/profiling/store";

export async function GET() {
  try {
    const analytics = await computeAnalytics();
    return NextResponse.json(analytics);
  } catch (err) {
    console.error("[profiling/analytics] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Analytics failed" },
      { status: 500 }
    );
  }
}
