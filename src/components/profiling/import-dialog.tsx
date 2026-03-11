"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, FileText, Loader2, Check, AlertCircle, Download, Info } from "lucide-react";

interface ImportDialogProps {
  onImported: () => void;
}

interface ImportResult {
  import_id: string;
  total_rows: number;
  imported: number;
  skipped: number;
  failed: number;
  errors: Array<{ username: string; error: string }>;
}

type Mode = "ig_export" | "file" | "json" | "usernames";

export function ImportDialog({ onImported }: ImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("ig_export");
  const [textInput, setTextInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/profiling/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
        onImported();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка импорта");
    } finally {
      setLoading(false);
    }
  };

  const handleTextImport = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      let body: unknown;

      if (mode === "usernames") {
        const usernames = textInput
          .split(/[\n,;]+/)
          .map((u) => u.trim().replace(/^@/, ""))
          .filter(Boolean);
        body = usernames.map((username) => ({ username }));
      } else {
        body = JSON.parse(textInput);
      }

      const res = await fetch("/api/profiling/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Array.isArray(body) ? body : [body]),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
        onImported();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка парсинга");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setTextInput("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Upload className="w-4 h-4" />
          Импорт
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Импорт фолловеров</DialogTitle>
          <DialogDescription>
            Загрузите экспорт из Instagram, CSV/JSON или вставьте юзернеймы
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-600">
              <Check className="w-5 h-5" />
              <span className="font-medium">Импорт завершён</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="p-2 rounded bg-muted/50 text-center">
                <p className="text-lg font-bold">{result.imported}</p>
                <p className="text-xs text-muted-foreground">Импортировано</p>
              </div>
              <div className="p-2 rounded bg-muted/50 text-center">
                <p className="text-lg font-bold">{result.skipped}</p>
                <p className="text-xs text-muted-foreground">Пропущено</p>
              </div>
              <div className="p-2 rounded bg-muted/50 text-center">
                <p className="text-lg font-bold">{result.failed}</p>
                <p className="text-xs text-muted-foreground">Ошибки</p>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-blue-500/10 text-sm space-y-1">
              <p className="font-medium flex items-center gap-1.5">
                <Info className="w-4 h-4" />
                Следующий шаг
              </p>
              <p className="text-muted-foreground text-xs">
                Профили импортированы с юзернеймами. Нажмите «Обогатить данные» в таблице,
                чтобы автоматически загрузить bio, аватарки и статистику для каждого профиля.
              </p>
            </div>
            <Button variant="outline" className="w-full" onClick={reset}>
              Импортировать ещё
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Mode tabs */}
            <div className="flex gap-1 flex-wrap">
              {([
                { id: "ig_export" as const, label: "Instagram Export" },
                { id: "file" as const, label: "CSV / JSON" },
                { id: "usernames" as const, label: "Юзернеймы" },
                { id: "json" as const, label: "JSON вручную" },
              ]).map((m) => (
                <Button
                  key={m.id}
                  variant={mode === m.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMode(m.id)}
                  className="text-xs"
                >
                  {m.label}
                </Button>
              ))}
            </div>

            {/* Instagram Export mode */}
            {mode === "ig_export" && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-muted/50 text-xs space-y-2">
                  <p className="font-medium text-foreground flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5" />
                    Как скачать свой список фолловеров из Instagram:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Откройте Instagram в браузере или приложении</li>
                    <li>
                      <strong>Настройки</strong> → <strong>Центр аккаунтов</strong> →
                      <strong> Ваша информация и разрешения</strong>
                    </li>
                    <li>
                      <strong>Скачивание информации</strong> → Выберите аккаунт
                    </li>
                    <li>
                      Отметьте <strong>«Подписчики и подписки»</strong>
                    </li>
                    <li>
                      Формат: <strong>JSON</strong>, Качество: любое
                    </li>
                    <li>
                      Нажмите <strong>«Создать файл»</strong> — ссылка придёт на email
                    </li>
                    <li>
                      Скачайте архив, найдите файл{" "}
                      <code className="bg-muted px-1 rounded">followers_1.json</code>
                    </li>
                  </ol>
                  <p className="text-muted-foreground pt-1">
                    Файл будет в папке{" "}
                    <code className="bg-muted px-1 rounded">
                      connections/followers_and_following/
                    </code>
                  </p>
                </div>

                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".json,.html,.htm,.csv"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(f);
                    }}
                  />
                  <FileText className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">
                    Загрузите followers_1.json
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    .json или .html из Instagram Data Export
                  </p>
                </div>
              </div>
            )}

            {/* CSV/JSON file mode */}
            {mode === "file" && (
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f);
                  }}
                />
                <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium">Нажмите или перетащите файл</p>
                <p className="text-xs text-muted-foreground mt-1">.csv или .json</p>
              </div>
            )}

            {/* Text input modes */}
            {(mode === "usernames" || mode === "json") && (
              <div className="space-y-2">
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={
                    mode === "usernames"
                      ? "username1\nusername2\nusername3\n\nили: username1, username2, username3\n\nМожно с @: @username1, @username2"
                      : '[\n  {"username": "example", "bio": "Designer", "followers_count": 1200}\n]'
                  }
                  className="w-full h-40 p-3 text-xs font-mono rounded-lg border bg-background resize-none"
                />
                <Button
                  onClick={handleTextImport}
                  disabled={loading || !textInput.trim()}
                  className="w-full"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Импортировать
                </Button>
              </div>
            )}

            {/* Error display */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {loading && (mode === "file" || mode === "ig_export") && (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm text-muted-foreground">Обработка...</span>
              </div>
            )}

            {/* Format help */}
            {mode === "file" && (
              <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Формат CSV:</p>
                <code className="block">username,full_name,bio,followers_count,external_url</code>
                <p className="font-medium text-foreground mt-2">Формат JSON:</p>
                <code className="block">{`[{"username":"...", "bio":"...", "followers_count":123}]`}</code>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
