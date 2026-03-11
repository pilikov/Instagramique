import { describe, it, expect } from "vitest";
import { buildProfile } from "../profiler";
import { extractSignals, detectLanguage } from "../extractors";
import {
  inferInterests,
  inferSegments,
  inferIntent,
  inferCommercial,
  inferGeo,
  computeSourceCompleteness,
} from "../inference";
import type { FollowerRawPayload } from "../types";

const DESIGNER_PROFILE: FollowerRawPayload = {
  username: "janedesigner",
  full_name: "Jane Doe — UI/UX Designer",
  bio: "Product designer at @somecompany. Typography nerd. Figma, Sketch. Open for freelance. 📐✏️ Based in Berlin.",
  external_url: "https://behance.net/janedesigner",
  category: "Designer",
  account_type: "BUSINESS",
  followers_count: 12500,
  follows_count: 800,
  media_count: 340,
  recent_captions: [
    "New project — branding for a fintech startup #design #branding #typography",
    "Exploring typeface combinations for the new identity system",
    "Just released a free Figma UI kit, link in bio!",
  ],
  is_business: true,
};

const MINIMAL_PROFILE: FollowerRawPayload = {
  username: "user123",
};

const RUSSIAN_PROFILE: FollowerRawPayload = {
  username: "sergey_photo",
  full_name: "Сергей Фотограф",
  bio: "Свадебный фотограф 📸 Москва. Пишите в директ для бронирования. Портфолио по ссылке ниже.",
  external_url: "https://sergey-photo.ru",
  followers_count: 5200,
  follows_count: 600,
  media_count: 870,
  recent_captions: [
    "Свадебная съёмка в усадьбе #свадьба #фотограф #wedding",
    "Новая серия портретов #портрет #фото",
  ],
};

const FITNESS_PROFILE: FollowerRawPayload = {
  username: "fitrunner",
  full_name: "Alex Runner",
  bio: "Marathon runner 🏃 | Triathlete | 3:05 PR | Coach. Strava addict. Based in Amsterdam.",
  external_url: "https://strava.com/athletes/fitrunner",
  followers_count: 3000,
  follows_count: 1200,
  media_count: 150,
  recent_captions: [
    "20k training run done! Preparing for Berlin Marathon #running #marathon #training",
    "Swim-bike-run combo today. Ironman prep is real 🏊🚴🏃",
  ],
};

describe("buildProfile", () => {
  it("produces a complete profile from rich data", () => {
    const profile = buildProfile(DESIGNER_PROFILE);

    expect(profile.id).toBe("ig_janedesigner");
    expect(profile.platform).toBe("instagram");
    expect(profile.username).toBe("janedesigner");
    expect(profile.display_name).toBe("Jane Doe — UI/UX Designer");
    expect(profile.detected_language).toBe("en");
    expect(profile.source_completeness_score).toBeGreaterThan(0.5);
    expect(profile.confidence_scores.overall).toBeGreaterThan(0);
    expect(profile.inferred_interests.length).toBeGreaterThan(0);
    expect(profile.inferred_segments.length).toBeGreaterThan(0);
    expect(profile.profile_version).toBe(1);
    expect(profile.raw_payload).toBe(DESIGNER_PROFILE);
  });

  it("handles minimal profiles gracefully", () => {
    const profile = buildProfile(MINIMAL_PROFILE);

    expect(profile.id).toBe("ig_user123");
    expect(profile.username).toBe("user123");
    expect(profile.source_completeness_score).toBeLessThan(0.3);
    expect(profile.confidence_scores.overall).toBeLessThanOrEqual(0.5);
    expect(profile.detected_language).toBe("unknown");
  });
});

describe("extractSignals", () => {
  it("extracts keywords from designer bio", () => {
    const signals = extractSignals(DESIGNER_PROFILE);

    expect(signals.keywords).toContain("ui_ux");
    expect(signals.keywords).toContain("typography");
    expect(signals.hashtags).toContain("design");
    expect(signals.hashtags).toContain("branding");
    expect(signals.hashtags).toContain("typography");
    expect(signals.emojis.length).toBeGreaterThan(0);
    expect(signals.link_categories).toContain("portfolio");
    expect(signals.location_hints).toContain("Berlin");
  });

  it("extracts hashtags from captions", () => {
    const signals = extractSignals(RUSSIAN_PROFILE);

    expect(signals.hashtags).toContain("свадьба");
    expect(signals.hashtags).toContain("фотограф");
    expect(signals.hashtags).toContain("wedding");
  });

  it("detects Russian location hints", () => {
    const signals = extractSignals(RUSSIAN_PROFILE);
    expect(signals.location_hints).toContain("Moscow");
  });

  it("detects contact clues", () => {
    const signals = extractSignals(RUSSIAN_PROFILE);
    expect(signals.contact_clues).toContain("invites_contact");
  });
});

describe("detectLanguage", () => {
  it("detects Russian", () => {
    expect(detectLanguage("Привет мир, это тестовый текст")).toBe("ru");
  });

  it("detects English", () => {
    expect(detectLanguage("Hello world, this is a test text")).toBe("en");
  });

  it("returns unknown for empty text", () => {
    expect(detectLanguage("")).toBe("unknown");
  });

  it("returns unknown for emoji-only", () => {
    expect(detectLanguage("🎨🖌️✏️")).toBe("unknown");
  });
});

describe("inferInterests", () => {
  it("infers design-related interests for designer profile", () => {
    const signals = extractSignals(DESIGNER_PROFILE);
    const interests = inferInterests(DESIGNER_PROFILE, signals);

    const tags = interests.map((i) => i.tag);
    expect(tags).toContain("ui_ux");
    expect(tags).toContain("typography");
    expect(tags).toContain("branding");
  });

  it("infers photography for Russian photographer", () => {
    const signals = extractSignals(RUSSIAN_PROFILE);
    const interests = inferInterests(RUSSIAN_PROFILE, signals);

    const tags = interests.map((i) => i.tag);
    expect(tags).toContain("photography");
  });

  it("infers fitness/running for runner profile", () => {
    const signals = extractSignals(FITNESS_PROFILE);
    const interests = inferInterests(FITNESS_PROFILE, signals);

    const tags = interests.map((i) => i.tag);
    expect(tags).toContain("running");
    expect(tags).toContain("triathlon");
  });

  it("stores evidence for each inference", () => {
    const signals = extractSignals(DESIGNER_PROFILE);
    const interests = inferInterests(DESIGNER_PROFILE, signals);

    for (const interest of interests) {
      expect(interest.evidence.length).toBeGreaterThan(0);
      expect(interest.source_fields.length).toBeGreaterThan(0);
      expect(interest.confidence).toBeGreaterThan(0);
      expect(interest.confidence).toBeLessThanOrEqual(1);
    }
  });

  it("returns empty for profiles without detectable interests", () => {
    const signals = extractSignals(MINIMAL_PROFILE);
    const interests = inferInterests(MINIMAL_PROFILE, signals);
    expect(interests.length).toBe(0);
  });
});

describe("inferSegments", () => {
  it("identifies designer segment", () => {
    const signals = extractSignals(DESIGNER_PROFILE);
    const segments = inferSegments(DESIGNER_PROFILE, signals);

    const tags = segments.map((s) => s.tag);
    expect(tags).toContain("designer");
  });

  it("identifies photographer segment for Russian photographer", () => {
    const signals = extractSignals(RUSSIAN_PROFILE);
    const segments = inferSegments(RUSSIAN_PROFILE, signals);

    const tags = segments.map((s) => s.tag);
    expect(tags).toContain("photographer");
  });
});

describe("inferIntent", () => {
  it("identifies business intent for business profile", () => {
    const signals = extractSignals(DESIGNER_PROFILE);
    const intent = inferIntent(DESIGNER_PROFILE, signals);

    const tags = intent.map((i) => i.tag);
    expect(tags).toContain("business");
  });

  it("defaults to personal for minimal profiles", () => {
    const signals = extractSignals(MINIMAL_PROFILE);
    const intent = inferIntent(MINIMAL_PROFILE, signals);

    const tags = intent.map((i) => i.tag);
    expect(tags).toContain("personal");
  });
});

describe("inferCommercial", () => {
  it("detects collaboration candidate for profiles with many followers", () => {
    const signals = extractSignals(DESIGNER_PROFILE);
    const commercial = inferCommercial(DESIGNER_PROFILE, signals);

    const tags = commercial.map((c) => c.tag);
    expect(tags).toContain("likely_collaboration_candidate");
  });
});

describe("inferGeo", () => {
  it("detects Berlin from text", () => {
    const signals = extractSignals(DESIGNER_PROFILE);
    const geo = inferGeo(DESIGNER_PROFILE, signals);

    const tags = geo.map((g) => g.tag);
    expect(tags).toContain("Berlin");
  });

  it("detects Moscow from Russian text", () => {
    const signals = extractSignals(RUSSIAN_PROFILE);
    const geo = inferGeo(RUSSIAN_PROFILE, signals);

    const tags = geo.map((g) => g.tag);
    expect(tags).toContain("Moscow");
  });

  it("detects Amsterdam from text", () => {
    const signals = extractSignals(FITNESS_PROFILE);
    const geo = inferGeo(FITNESS_PROFILE, signals);

    const tags = geo.map((g) => g.tag);
    expect(tags).toContain("Amsterdam");
  });
});

describe("computeSourceCompleteness", () => {
  it("gives high score for rich profiles", () => {
    const score = computeSourceCompleteness(DESIGNER_PROFILE);
    expect(score).toBeGreaterThan(0.7);
  });

  it("gives low score for minimal profiles", () => {
    const score = computeSourceCompleteness(MINIMAL_PROFILE);
    expect(score).toBeLessThan(0.2);
  });
});

describe("confidence scores", () => {
  it("overall confidence is bounded between 0 and 1", () => {
    const profiles = [DESIGNER_PROFILE, MINIMAL_PROFILE, RUSSIAN_PROFILE, FITNESS_PROFILE];

    for (const raw of profiles) {
      const profile = buildProfile(raw);
      expect(profile.confidence_scores.overall).toBeGreaterThanOrEqual(0);
      expect(profile.confidence_scores.overall).toBeLessThanOrEqual(1);
    }
  });

  it("rich profiles have higher confidence than minimal ones", () => {
    const rich = buildProfile(DESIGNER_PROFILE);
    const minimal = buildProfile(MINIMAL_PROFILE);

    expect(rich.confidence_scores.overall).toBeGreaterThan(minimal.confidence_scores.overall);
  });
});

describe("safety: no sensitive categories", () => {
  it("does not infer protected attributes", () => {
    const sensitive = [
      "religion", "political_affiliation", "sexual_orientation",
      "ethnicity", "health_condition", "disability",
    ];

    const profiles = [DESIGNER_PROFILE, RUSSIAN_PROFILE, FITNESS_PROFILE];

    for (const raw of profiles) {
      const profile = buildProfile(raw);
      const allTags = [
        ...profile.inferred_interests,
        ...profile.inferred_segments,
        ...profile.inferred_intent,
        ...profile.inferred_commercial,
      ].map((t) => t.tag);

      for (const s of sensitive) {
        expect(allTags).not.toContain(s);
      }
    }
  });
});
