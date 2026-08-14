"use client";

import { useEffect, useState } from "react";

type Props = {
  videoId: string;
  videoTitle: string;
};

const MAX_LEN = 1000;

function errorMessage(data: unknown, fallback: string) {
  const err = (data as { error?: unknown })?.error;
  if (typeof err === "string") return err;
  const nested = err as {
    fieldErrors?: { content?: string[] };
    formErrors?: string[];
  } | null;
  return nested?.fieldErrors?.content?.[0] ?? nested?.formErrors?.[0] ?? fallback;
}

export function VideoMemoBox({ videoId, videoTitle }: Props) {
  const [content, setContent] = useState("");
  const [memoId, setMemoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setContent("");
    setMemoId(null);
    setMessage(null);
    setError(null);
    setLoading(true);

    fetch(`/api/memos?videoId=${encodeURIComponent(videoId)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => []);
        if (cancelled) return;
        const latest = Array.isArray(data) ? data[0] : null;
        if (latest?.id && typeof latest.content === "string") {
          setMemoId(latest.id);
          setContent(latest.content);
        }
      })
      .catch(() => {
        if (!cancelled) setError("메모를 불러오지 못했습니다");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [videoId]);

  async function saveMemo(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) {
      setError("메모 내용을 입력하세요");
      return;
    }
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(memoId ? `/api/memos/${memoId}` : "/api/memos", {
        method: memoId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          memoId
            ? { content: trimmed }
            : {
                content: trimmed,
                videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
                videoTitle,
                videoId,
              },
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(errorMessage(data, "저장에 실패했습니다"));
        return;
      }
      if (typeof data?.id === "string") setMemoId(data.id);
      setContent(trimmed);
      setMessage("메모를 저장했습니다");
    } catch {
      setError("네트워크 오류로 저장하지 못했습니다");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={saveMemo} className="space-y-2 border-t border-ink/10 pt-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-ink">메모</p>
        <span className="text-[11px] text-ink/40">
          {content.length}/{MAX_LEN}
        </span>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value.slice(0, MAX_LEN))}
        maxLength={MAX_LEN}
        rows={5}
        disabled={loading}
        placeholder={
          loading ? "메모를 불러오는 중…" : "재생 중인 영상에 대한 메모를 남겨 보세요"
        }
        className="w-full resize-y rounded-lg border border-ink/15 bg-paper px-3 py-2 text-sm leading-relaxed text-ink outline-none ring-crimson/30 placeholder:text-ink/35 focus:ring-2 disabled:opacity-60"
      />
      <div className="flex items-center justify-between gap-2">
        <p className="min-h-[1rem] text-[11px]">
          {error ? (
            <span className="text-crimson">{error}</span>
          ) : message ? (
            <span className="text-emerald-700">{message}</span>
          ) : (
            <span className="text-ink/40">
              저장 후에도 내용이 남습니다. 다시 저장하면 같은 메모가 수정됩니다.
            </span>
          )}
        </p>
        <button
          type="submit"
          disabled={pending || loading || !content.trim()}
          className="shrink-0 rounded-lg bg-crimson px-3 py-1.5 text-xs font-medium text-paper hover:bg-crimson/90 disabled:opacity-50"
        >
          {pending ? "저장 중…" : memoId ? "수정 저장" : "메모 저장"}
        </button>
      </div>
    </form>
  );
}
