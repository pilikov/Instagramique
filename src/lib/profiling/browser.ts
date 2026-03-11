import path from "path";
import fs from "fs";
import type { FollowerRawPayload } from "./types";

const CHROME_PROFILE_DIR = path.join(process.cwd(), "data", "chrome-profile");

function findChrome(): string {
  // CHROME_PATH from .env.local — trust it directly,
  // fs.existsSync may fail in sandbox environments
  if (process.env.CHROME_PATH) {
    return process.env.CHROME_PATH;
  }

  // Well-known paths — try without fs check since sandbox may not see host FS
  const platform = process.platform;

  if (platform === "darwin") {
    return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  }
  if (platform === "win32") {
    return "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  }

  // Linux candidates
  const linuxPaths = [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ];
  for (const p of linuxPaths) {
    try { if (fs.existsSync(p)) return p; } catch { /* continue */ }
  }

  throw new Error(
    "Chrome не найден. Укажите путь в переменной CHROME_PATH в .env.local"
  );
}

export type BrowserEventType = "status" | "progress" | "login_required" | "done" | "error";

export interface BrowserEvent {
  type: BrowserEventType;
  message?: string;
  count?: number;
  username?: string;
  total_fetched?: number;
  profiled?: number;
  failed?: number;
}

type ProgressFn = (event: BrowserEvent) => void;

let activeBrowser: import("puppeteer").Browser | null = null;

/**
 * Launch a visible Chromium instance, authenticate on Instagram (reusing
 * a persistent profile so login is only needed once), fetch the full
 * followers list via Instagram's internal API, profile them, and stream
 * progress back to the caller.
 */
export async function fetchFollowersWithBrowser(onProgress: ProgressFn): Promise<void> {
  if (activeBrowser) {
    onProgress({ type: "error", message: "Браузер уже запущен. Дождитесь завершения." });
    return;
  }

  const puppeteer = await import("puppeteer");

  let chromePath: string;
  try {
    chromePath = findChrome();
  } catch (err) {
    onProgress({ type: "error", message: (err as Error).message });
    return;
  }

  onProgress({ type: "status", message: "Запуск браузера..." });

  const browser = await puppeteer.default.launch({
    headless: false,
    executablePath: chromePath,
    userDataDir: CHROME_PROFILE_DIR,
    defaultViewport: { width: 1280, height: 900 },
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
    ],
  });
  activeBrowser = browser;

  try {
    const page = (await browser.pages())[0] || (await browser.newPage());

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
    });

    onProgress({ type: "status", message: "Открываем Instagram..." });
    await page.goto("https://www.instagram.com/", { waitUntil: "networkidle2", timeout: 30000 });

    const loggedIn = await page.evaluate(
      () => !document.querySelector('[name="username"]') && !document.querySelector('[type="password"]')
    );

    if (!loggedIn) {
      onProgress({ type: "login_required", message: "Войдите в Instagram в открывшемся окне браузера" });

      await page.waitForFunction(
        () => {
          const url = window.location.href;
          return !url.includes("/accounts/login") && !document.querySelector('[name="username"]');
        },
        { timeout: 300_000, polling: 2000 }
      );
      await new Promise((r) => setTimeout(r, 3000));
    }

    onProgress({ type: "status", message: "Получаем данные аккаунта..." });

    const userInfo = await page.evaluate(async () => {
      const r = await fetch("/api/v1/accounts/current_user/?edit=true");
      if (!r.ok) return null;
      const d = (await r.json()) as { user: { pk: string; username: string } };
      return { pk: String(d.user.pk), username: d.user.username };
    });

    if (!userInfo) {
      onProgress({ type: "error", message: "Не удалось получить данные аккаунта" });
      return;
    }

    onProgress({ type: "status", message: `@${userInfo.username} — загружаем подписчиков...`, username: userInfo.username });

    const allFollowers: FollowerRawPayload[] = [];
    let maxId: string | null = null;
    let hasMore = true;
    let pageNum = 0;

    interface PageResult {
      users: Array<{ username: string; full_name: string; profile_picture_url: string; is_verified: boolean; is_private: boolean }>;
      has_more: boolean;
      next_max_id: string | null;
      http: number;
    }

    while (hasMore) {
      const result: PageResult = await page.evaluate(
        async (uid, mid) => {
          const p = new URLSearchParams({ count: "50", search_surface: "follow_list_page" });
          if (mid) p.set("max_id", mid);
          const r = await fetch(`/api/v1/friendships/${uid}/followers/?${p}`);
          if (!r.ok) return { users: [], has_more: false, next_max_id: null, http: r.status };
          const d = await r.json();
          return {
            users: (d.users || []).map((u: Record<string, unknown>) => ({
              username: String(u.username || ""),
              full_name: String(u.full_name || ""),
              profile_picture_url: String(u.profile_pic_url || ""),
              is_verified: !!u.is_verified,
              is_private: !!u.is_private,
            })),
            has_more: !!d.has_more && !!d.next_max_id,
            next_max_id: d.next_max_id || null,
            http: 200,
          };
        },
        userInfo.pk,
        maxId
      );

      if (result.http === 429) {
        onProgress({ type: "status", message: `Rate limit — пауза 30 сек (загружено ${allFollowers.length})` });
        await new Promise((r) => setTimeout(r, 30_000));
        continue;
      }

      if (result.http !== 200) {
        onProgress({ type: "error", message: `Instagram вернул HTTP ${result.http}. Загружено ${allFollowers.length}.` });
        break;
      }

      for (const u of result.users) {
        allFollowers.push(u as FollowerRawPayload);
      }
      hasMore = result.has_more;
      maxId = result.next_max_id;
      pageNum++;

      onProgress({ type: "progress", count: allFollowers.length, message: `Страница ${pageNum}: ${allFollowers.length} подписчиков` });

      if (hasMore) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    if (allFollowers.length === 0) {
      onProgress({ type: "error", message: "Не удалось загрузить подписчиков" });
      return;
    }

    onProgress({ type: "status", message: `Профилирование ${allFollowers.length} подписчиков...` });

    const { profileBatch } = await import("./profiler");
    const { run } = await profileBatch(allFollowers);

    onProgress({
      type: "done",
      total_fetched: allFollowers.length,
      profiled: run.succeeded,
      failed: run.failed,
      message: `Готово! ${allFollowers.length} подписчиков загружены и профилированы.`,
    });
  } catch (err) {
    onProgress({ type: "error", message: err instanceof Error ? err.message : "Неизвестная ошибка" });
  } finally {
    try { await browser.close(); } catch { /* already closed */ }
    activeBrowser = null;
  }
}
