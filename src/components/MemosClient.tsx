"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { parseYoutubeVideoInput } from "@/lib/youtube-url";

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

const MAX_LEN = 1000;

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

function toMemoRow(raw: Record<string, unknown>): MemoRow {
  return {
    id: String(raw.id),
    content: String(raw.content ?? ""),
    videoUrl: String(raw.videoUrl ?? ""),
    videoTitle: (raw.videoTitle as string | null) ?? null,
    videoId: (raw.videoId as string | null) ?? null,
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
  };
}

function errorMessage(data: unknown, fallback: string) {
  const err = (data as { error?: unknown })?.error;
  if (typeof err === "string") return err;
  const nested = err as {
    fieldErrors?: { content?: string[]; videoUrl?: string[] };
    formErrors?: string[];
  } | null;
  return (
    nested?.fieldErrors?.content?.[0] ??
    nested?.fieldErrors?.videoUrl?.[0] ??
    nested?.formErrors?.[0] ??
    fallback
  );
}

export function MemosClient({ initialMemos }: Props) {
  const router = useRouter();
  const [memos, setMemos] = useState(initialMemos);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState("");
  const [draftUrl, setDraftUrl] = useState("");
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  useEffect(() => {
    setMemos(initialMemos);
  }, [initialMemos]);

  async function addMemo(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) {
      setError("메모 내용을 입력하세요");
      return;
    }

    let videoUrl = "";
    let videoId: string | null = null;
    if (draftUrl.trim()) {
      const parsed = parseYoutubeVideoInput(draftUrl);
      if (!parsed || !parsed.videoId) {
        setError("올바른 YouTube URL을 입력하세요");
        return;
      }
      videoUrl = parsed.videoUrl;
      videoId = parsed.videoId;
    }

    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/memos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmed,
          videoUrl: videoUrl || undefined,
          videoId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(errorMessage(data, "추가에 실패했습니다"));
        return;
      }
      setMemos((prev) => [toMemoRow(data), ...prev]);
      setDraft("");
      setDraftUrl("");
      router.refresh();
    } catch {
      setError("네트워크 오류로 추가하지 못했습니다");
    } finally {
      setAdding(false);
    }
  }

  function startEdit(memo: MemoRow) {
    setEditingId(memo.id);
    setEditDraft(memo.content);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft("");
  }

  async function saveEdit(id: string) {
    const trimmed = editDraft.trim();
    if (!trimmed) {
      setError("메모 내용을 입력하세요");
      return;
    }
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/memos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(errorMessage(data, "수정에 실패했습니다"));
        return;
      }
      setMemos((prev) =>
        prev.map((m) => (m.id === id ? { ...m, content: trimmed } : m)),
      );
      cancelEdit();
      router.refresh();
    } catch {
      setError("네트워크 오류로 수정하지 못했습니다");
    } finally {
      setBusyId(null);
    }
  }

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
      if (editingId === id) cancelEdit();
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
          재생 패널에서 저장한 메모가 날짜순으로 쌓입니다. 여기서 내용을 추가하거나
          수정할 수 있습니다.
        </p>
      </div>

      <form
        onSubmit={addMemo}
        className="space-y-2 rounded-xl border border-ink/10 bg-paper px-4 py-3.5"
      >
        <p className="text-xs font-semibold text-ink">메모 추가</p>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_LEN))}
          maxLength={MAX_LEN}
          rows={4}
          placeholder="메모 내용을 입력하세요"
          className="w-full resize-y rounded-lg border border-ink/15 bg-paper px-3 py-2 text-sm leading-relaxed text-ink outline-none ring-crimson/30 placeholder:text-ink/35 focus:ring-2"
        />
        <input
          type="url"
          value={draftUrl}
          onChange={(e) => setDraftUrl(e.target.value)}
          placeholder="YouTube URL (선택)"
          className="w-full rounded-lg border border-ink/15 bg-paper px-3 py-2 text-sm text-ink outline-none ring-crimson/30 placeholder:text-ink/35 focus:ring-2"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-ink/40">
            {draft.length}/{MAX_LEN}
          </span>
          <button
            type="submit"
            disabled={adding || !draft.trim()}
            className="rounded-lg bg-crimson px-3 py-1.5 text-xs font-medium text-paper hover:bg-crimson/90 disabled:opacity-50"
          >
            {adding ? "추가 중…" : "추가"}
          </button>
        </div>
      </form>

      {error ? <p className="text-sm text-crimson">{error}</p> : null}

      {memos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink/15 bg-ink/[0.02] px-4 py-12 text-center text-sm text-ink/50">
          아직 저장된 메모가 없습니다. 위에서 바로 추가하거나, 폴더에서 영상을
          재생한 뒤 메모를 남겨 보세요.
        </div>
      ) : (
        <ul className="space-y-3">
          {memos.map((m) => {
            const isEditing = editingId === m.id;
            const busy = busyId === m.id;
            return (
              <li
                key={m.id}
                className="rounded-xl border border-ink/10 bg-paper px-4 py-3.5"
              >
                <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-ink/45">
                      {formatDate(m.createdAt)}
                    </p>
                    {m.videoUrl ? (
                      <>
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
                      </>
                    ) : (
                      <p className="mt-1 text-sm font-semibold text-ink/55">
                        영상 없음
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => saveEdit(m.id)}
                          disabled={busy || !editDraft.trim()}
                          className="rounded-lg bg-crimson px-2.5 py-1 text-xs font-medium text-paper hover:bg-crimson/90 disabled:opacity-50"
                        >
                          {busy ? "저장 중…" : "저장"}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={busy}
                          className="rounded-lg px-2.5 py-1 text-xs text-ink/50 hover:bg-ink/5 hover:text-ink disabled:opacity-50"
                        >
                          취소
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(m)}
                          disabled={busy}
                          className="rounded-lg px-2.5 py-1 text-xs text-ink/50 hover:bg-ink/5 hover:text-ink disabled:opacity-50"
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => removeMemo(m.id)}
                          disabled={busy}
                          className="rounded-lg px-2.5 py-1 text-xs text-ink/50 hover:bg-ink/5 hover:text-crimson disabled:opacity-50"
                        >
                          {busy ? "삭제 중…" : "삭제"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {isEditing ? (
                  <textarea
                    value={editDraft}
                    onChange={(e) =>
                      setEditDraft(e.target.value.slice(0, MAX_LEN))
                    }
                    maxLength={MAX_LEN}
                    rows={5}
                    className="w-full resize-y rounded-lg border border-ink/15 bg-paper px-3 py-2 text-sm leading-relaxed text-ink outline-none ring-crimson/30 focus:ring-2"
                  />
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
                    {m.content}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
