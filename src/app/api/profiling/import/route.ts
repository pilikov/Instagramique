import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import type { FollowerRawPayload, ImportRecord } from "@/lib/profiling/types";
import { profileBatch } from "@/lib/profiling/profiler";
import { createImport } from "@/lib/profiling/store";
import {
  parseInstagramExport,
  parseInstagramExportHTML,
} from "@/lib/profiling/scraper";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    let rawProfiles: FollowerRawPayload[] = [];
    let filename = "manual_import";
    let format: ImportRecord["format"] = "json";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      filename = file.name;
      const text = await file.text();

      if (file.name.endsWith(".csv")) {
        format = "csv";
        rawProfiles = parseCSV(text);
      } else if (file.name.endsWith(".json")) {
        format = "json";
        const igExport = parseInstagramExport(text);
        if (igExport.length > 0) {
          rawProfiles = igExport.map((f) => ({ username: f.username }));
        } else {
          rawProfiles = parseJSON(text);
        }
      } else if (file.name.endsWith(".html") || file.name.endsWith(".htm")) {
        format = "json";
        const igExportHTML = parseInstagramExportHTML(text);
        if (igExportHTML.length > 0) {
          rawProfiles = igExportHTML.map((f) => ({ username: f.username }));
        } else {
          return NextResponse.json(
            { error: "Could not parse HTML file. Expected Instagram data export format." },
            { status: 400 }
          );
        }
      } else {
        return NextResponse.json(
          { error: "Unsupported file format. Use .csv, .json or .html" },
          { status: 400 }
        );
      }
    } else {
      const body = await request.json();
      if (Array.isArray(body)) {
        rawProfiles = body.map(normalizeImportRow);
        format = "json";
      } else if (body.profiles && Array.isArray(body.profiles)) {
        rawProfiles = body.profiles.map(normalizeImportRow);
        format = "json";
        filename = body.filename || filename;
      } else {
        return NextResponse.json(
          { error: "Expected array of profiles or { profiles: [...] }" },
          { status: 400 }
        );
      }
    }

    const validProfiles = rawProfiles.filter((p) => p.username && p.username.trim().length > 0);
    const skipped = rawProfiles.length - validProfiles.length;

    if (validProfiles.length === 0) {
      return NextResponse.json(
        { error: "No valid profiles found (username is required)" },
        { status: 400 }
      );
    }

    const { run, results } = await profileBatch(validProfiles);

    const importRecord: ImportRecord = {
      id: randomUUID(),
      filename,
      format,
      imported_at: new Date().toISOString(),
      total_rows: rawProfiles.length,
      imported_count: results.length,
      skipped_count: skipped + run.failed,
      errors: run.errors.map((e) => `${e.username}: ${e.error}`),
    };
    await createImport(importRecord);

    return NextResponse.json({
      import_id: importRecord.id,
      run_id: run.id,
      total_rows: rawProfiles.length,
      imported: results.length,
      skipped: skipped,
      failed: run.failed,
      errors: run.errors,
    }, { headers: CORS_HEADERS });
  } catch (err) {
    console.error("[profiling/import] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Import failed" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

function parseCSV(text: string): FollowerRawPayload[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ""));
  const profiles: FollowerRawPayload[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] || "").replace(/^"|"$/g, "").trim();
    });
    profiles.push(normalizeImportRow(row));
  }

  return profiles;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function parseJSON(text: string): FollowerRawPayload[] {
  const data = JSON.parse(text);
  const array = Array.isArray(data) ? data : data.profiles || data.data || data.followers || [];
  return array.map(normalizeImportRow);
}

function normalizeImportRow(row: Record<string, unknown>): FollowerRawPayload {
  return {
    username: str(row.username || row.user || row.handle || row.ig_username || ""),
    full_name: str(row.full_name || row.name || row.display_name || ""),
    bio: str(row.bio || row.biography || row.description || ""),
    external_url: str(row.external_url || row.website || row.url || row.link || ""),
    category: str(row.category || ""),
    account_type: str(row.account_type || row.type || ""),
    profile_picture_url: str(row.profile_picture_url || row.avatar || row.photo || ""),
    followers_count: num(row.followers_count || row.followers),
    follows_count: num(row.follows_count || row.following),
    media_count: num(row.media_count || row.posts || row.media),
    recent_captions: asStringArray(row.recent_captions || row.captions),
    recent_media_urls: asStringArray(row.recent_media_urls),
    recent_hashtags: asStringArray(row.recent_hashtags || row.hashtags),
    is_verified: bool(row.is_verified || row.verified),
    is_business: bool(row.is_business || row.business),
    contact_email: str(row.contact_email || row.email || ""),
    contact_phone: str(row.contact_phone || row.phone || ""),
    city_name: str(row.city_name || row.city || row.location || ""),
  };
}

function str(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

function num(v: unknown): number | undefined {
  if (v == null) return undefined;
  const n = Number(v);
  return isNaN(n) ? undefined : n;
}

function bool(v: unknown): boolean | undefined {
  if (v == null) return undefined;
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return ["true", "1", "yes"].includes(v.toLowerCase());
  return Boolean(v);
}

function asStringArray(v: unknown): string[] | undefined {
  if (!v) return undefined;
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return v.split(";").map((s) => s.trim()).filter(Boolean);
    }
  }
  return undefined;
}
