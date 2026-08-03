"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type MemoRow = {
  id: string;
  content: string;
  videoUrl: string;
  videoTitle: string | null;
  videoId: string | null;
  createdAt: string | Date;
};

type Props = {
  initialMemos: MemoRow[];
};

function formatDate(value: string | Date) {
  const d = new Date(value);
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function MemosClient({ initialMemos }: Props) {
  const router = useRouter();
  const [memos, setMemos] = useState(initialMemos);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function removeMemo(id: string) {
    if (!confirm("이 메모를 삭제할까요?")) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/memos/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setError("삭제에 실패했습니다");
        return;
      }
      setMemos((prev) => prev.filter((m) => m.id !== id));
      router.refresh();
    } catch {
      setError("네트워크 오류로 삭제하지 못했습니다");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 overflow-x-hidden px-4 py-8 sm:px-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">메모장</h1>
        <p className="mt-2 text-sm text-ink/55">
          재생 패널에서 저장한 메모가 날짜순으로 쌓입니다.
        </p>
      </div>

      {error ? <p className="text-sm text-crimson">{error}</p> : null}

      {memos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink/15 bg-ink/[0.02] px-4 py-12 text-center text-sm text-ink/50">
          아직 저장된 메모가 없습니다. 폴더에서 영상을 재생한 뒤 메모를
          남겨 보세요.
        </div>
      ) : (
        <ul className="space-y-3">
          {memos.map((m) => (
            <li
              key={m.id}
              className="rounded-xl border border-ink/10 bg-paper px-4 py-3.5"
            >
              <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-ink/45">
                    {formatDate(m.createdAt)}
                  </p>
                  <a
                    href={m.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block truncate text-sm font-semibold text-crimson hover:underline"
                  >
                    {m.videoTitle || m.videoUrl}
                  </a>
                  <p className="mt-0.5 truncate text-[11px] text-ink/40">
                    {m.videoUrl}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeMemo(m.id)}
                  disabled={busyId === m.id}
                  className="shrink-0 rounded-lg px-2.5 py-1 text-xs text-ink/50 hover:bg-ink/5 hover:text-crimson disabled:opacity-50"
                >
                  {busyId === m.id ? "삭제 중…" : "삭제"}
                </button>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
                {m.content}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
