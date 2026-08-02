"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

type FolderOption = { id: string; name: string };

type Props = {
  open: boolean;
  onClose: () => void;
  folders: FolderOption[];
  defaultFolderId?: string;
};

export function AddLinkModal({ open, onClose, folders, defaultFolderId }: Props) {
  const router = useRouter();
  const [platform, setPlatform] = useState<"x" | "facebook">("x");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [folderId, setFolderId] = useState(defaultFolderId ?? folders[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open) {
      setPlatform("x");
      setName("");
      setUrl("");
      setFolderId(defaultFolderId ?? folders[0]?.id ?? "");
      setError(null);
    }
  }, [open, defaultFolderId, folders]);

  if (!open) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          name,
          url,
          folderIds: [folderId],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg =
          data?.error?.fieldErrors?.url?.[0] ??
          data?.error?.formErrors?.[0] ??
          data?.error ??
          "저장 실패";
        setError(typeof msg === "string" ? msg : "URL을 확인해 주세요");
        return;
      }
      onClose();
      router.refresh();
    } catch {
      setError("네트워크 오류");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]"
        aria-label="닫기"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-ink/10 bg-paper p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-xl text-ink">링크 추가</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-ink/50 hover:bg-ink/5 hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink/50">
              플랫폼
            </p>
            <div className="flex gap-2">
              {(["x", "facebook"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatform(p)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    platform === p
                      ? "border-crimson bg-crimson text-paper"
                      : "border-ink/15 bg-transparent text-ink hover:border-ink/30"
                  }`}
                >
                  {p === "x" ? "X" : "Facebook"}
                </button>
              ))}
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-ink/50">
              채널 · 페이지 이름
            </span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none ring-crimson/30 focus:ring-2"
              placeholder="예: OpenAI"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-ink/50">
              URL
            </span>
            <input
              required
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none ring-crimson/30 focus:ring-2"
              placeholder={
                platform === "x"
                  ? "https://x.com/username"
                  : "https://www.facebook.com/pagename"
              }
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-ink/50">
              소속 폴더
            </span>
            <select
              required
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              className="w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none ring-crimson/30 focus:ring-2"
            >
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>

          {error ? <p className="text-sm text-crimson">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-ink/70 hover:bg-ink/5"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={pending || !folderId}
              className="rounded-lg bg-crimson px-4 py-2 text-sm font-medium text-paper hover:bg-crimson/90 disabled:opacity-50"
            >
              {pending ? "저장 중…" : "추가"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
