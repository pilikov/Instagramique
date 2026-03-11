import type { FollowerRawPayload, ExtractedSignals } from "./types";
import {
  INTEREST_KEYWORDS,
  SEGMENT_KEYWORDS,
  LINK_DOMAIN_CATEGORIES,
  EMOJI_INTEREST_MAP,
  GEO_KEYWORDS,
} from "./taxonomy";

export function extractSignals(raw: FollowerRawPayload): ExtractedSignals {
  const bio = (raw.bio || "").toLowerCase();
  const fullName = (raw.full_name || "").toLowerCase();
  const url = raw.external_url || "";
  const captions = (raw.recent_captions || []).map((c) => c.toLowerCase());
  const allText = [bio, fullName, ...captions].join(" ");

  return {
    keywords: extractKeywords(allText),
    hashtags: extractHashtags(raw),
    emojis: extractEmojis(allText),
    link_domains: extractLinkDomains(url),
    link_categories: categorizeLinkDomains(url),
    detected_language: detectLanguage(bio || captions.join(" ")),
    bio_tokens: tokenize(bio),
    caption_tokens: captions.flatMap(tokenize),
    location_hints: extractGeoHints(allText),
    contact_clues: extractContactClues(raw),
    category_signals: extractCategorySignals(raw),
  };
}

function extractKeywords(text: string): string[] {
  const found = new Set<string>();
  const allDicts = { ...INTEREST_KEYWORDS, ...SEGMENT_KEYWORDS };

  for (const [category, keywords] of Object.entries(allDicts)) {
    for (const kw of keywords) {
      if (text.includes(kw.toLowerCase())) {
        found.add(category);
        break;
      }
    }
  }
  return [...found];
}

function extractHashtags(raw: FollowerRawPayload): string[] {
  const sources = [
    raw.bio || "",
    ...(raw.recent_captions || []),
  ];
  const hashtagSet = new Set<string>();
  const regex = /#([\p{L}\p{N}_]+)/gu;

  for (const source of sources) {
    let match;
    while ((match = regex.exec(source)) !== null) {
      hashtagSet.add(match[1].toLowerCase());
    }
  }
  return [...hashtagSet];
}

function extractEmojis(text: string): string[] {
  const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
  const found = new Set<string>();
  let match;
  while ((match = emojiRegex.exec(text)) !== null) {
    found.add(match[0]);
  }
  return [...found];
}

function extractLinkDomains(url: string): string[] {
  if (!url) return [];
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return [parsed.hostname.replace(/^www\./, "")];
  } catch {
    return [];
  }
}

function categorizeLinkDomains(url: string): string[] {
  const domains = extractLinkDomains(url);
  if (domains.length === 0) return [];

  const categories = new Set<string>();
  for (const domain of domains) {
    for (const [cat, domainList] of Object.entries(LINK_DOMAIN_CATEGORIES)) {
      if (domainList.some((d) => domain.includes(d) || domain.endsWith(d))) {
        categories.add(cat);
      }
    }
  }
  return [...categories];
}

const CYRILLIC_RANGE = /[\u0400-\u04FF]/;
const CJK_RANGE = /[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]/;
const ARABIC_RANGE = /[\u0600-\u06FF]/;
const LATIN_RANGE = /[a-zA-Z]/;

export function detectLanguage(text: string): string {
  if (!text || text.trim().length === 0) return "unknown";

  const cleaned = text.replace(/[#@\d\s\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "");
  if (cleaned.length < 3) return "unknown";

  let cyrillic = 0;
  let latin = 0;
  let cjk = 0;
  let arabic = 0;

  for (const char of cleaned) {
    if (CYRILLIC_RANGE.test(char)) cyrillic++;
    else if (LATIN_RANGE.test(char)) latin++;
    else if (CJK_RANGE.test(char)) cjk++;
    else if (ARABIC_RANGE.test(char)) arabic++;
  }

  const total = cyrillic + latin + cjk + arabic;
  if (total === 0) return "unknown";

  if (cyrillic / total > 0.5) return "ru";
  if (cjk / total > 0.3) return "zh";
  if (arabic / total > 0.3) return "ar";
  if (latin / total > 0.5) return "en";

  return "mixed";
}

function extractGeoHints(text: string): string[] {
  const hints = new Set<string>();
  for (const [city, patterns] of Object.entries(GEO_KEYWORDS)) {
    for (const pattern of patterns) {
      if (text.includes(pattern.toLowerCase())) {
        hints.add(city);
        break;
      }
    }
  }
  return [...hints];
}

function extractContactClues(raw: FollowerRawPayload): string[] {
  const clues: string[] = [];
  const bio = (raw.bio || "").toLowerCase();

  if (raw.contact_email || bio.includes("@") && bio.includes(".")) {
    clues.push("has_email");
  }
  if (raw.contact_phone || /(\+?\d[\d\s\-]{7,})/.test(bio)) {
    clues.push("has_phone");
  }
  if (/dm|direct|написать|пишите|write|contact/i.test(bio)) {
    clues.push("invites_contact");
  }
  if (/whatsapp|telegram|viber|wa\.me|t\.me/i.test(bio)) {
    clues.push("has_messenger");
  }
  return clues;
}

function extractCategorySignals(raw: FollowerRawPayload): string[] {
  const signals: string[] = [];
  if (raw.category) signals.push(`category:${raw.category}`);
  if (raw.account_type) signals.push(`account_type:${raw.account_type}`);
  if (raw.is_business) signals.push("is_business");
  if (raw.is_verified) signals.push("is_verified");
  return signals;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

export function getEmojiInterests(emojis: string[]): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const emoji of emojis) {
    const interests = EMOJI_INTEREST_MAP[emoji];
    if (interests) {
      result.set(emoji, interests);
    }
  }
  return result;
}
