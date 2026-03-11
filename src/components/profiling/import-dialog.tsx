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
import { Upload, FileText, Loader2, Check, AlertCircle } from "lucide-react";

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

export function ImportDialog({ onImported }: ImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"file" | "json" | "usernames">("file");
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Импорт фолловеров</DialogTitle>
          <DialogDescription>
            Загрузите CSV/JSON файл или вставьте данные вручную
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
            <Button variant="outline" className="w-full" onClick={reset}>
              Импортировать ещё
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-1.5">
              {(["file", "json", "usernames"] as const).map((m) => (
                <Button
                  key={m}
                  variant={mode === m ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMode(m)}
                  className="text-xs"
                >
                  {m === "file" ? "Файл" : m === "json" ? "JSON" : "Юзернеймы"}
                </Button>
              ))}
            </div>

            {mode === "file" ? (
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
            ) : (
              <div className="space-y-2">
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={
                    mode === "usernames"
                      ? "username1\nusername2\nusername3\n\nили: username1, username2, username3"
                      : '[\n  {"username": "example", "bio": "Designer"}\n]'
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

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {loading && mode === "file" && (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm text-muted-foreground">Обработка...</span>
              </div>
            )}

            <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Формат CSV:</p>
              <code className="block">username,full_name,bio,followers_count,external_url</code>
              <p className="font-medium text-foreground mt-2">Формат JSON:</p>
              <code className="block">{`[{"username":"...", "bio":"...", "followers_count":123}]`}</code>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
