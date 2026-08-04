"use client";

import { useEffect, useState } from "react";

type Props = {
  videoId: string;
  videoTitle: string;
  channelName?: string;
};

export function VideoSummaryBox({
  videoId,
  videoTitle,
  channelName,
}: Props) {
  const [summary, setSummary] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setSummary(null);
    setWarning(null);
    setError(null);
  }, [videoId]);

  async function summarize() {
    setPending(true);
    setError(null);
    setWarning(null);
    try {
      const res = await fetch("/api/videos/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, videoTitle, channelName }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        summary?: string;
        warning?: string;
        error?: string | { formErrors?: string[] };
      };
      if (!res.ok) {
        const msg =
          typeof data.error === "string"
            ? data.error
            : data.error?.formErrors?.[0] ?? `요약 실패 (${res.status})`;
        setError(msg);
        return;
      }
      setSummary(data.summary ?? "");
      setWarning(data.warning ?? null);
    } catch {
      setError("네트워크 오류로 요약하지 못했습니다");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2 border-t border-ink/10 pt-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-ink">Gemini 요약</p>
          <p className="text-[11px] text-ink/40">
            재생 중 영상의 주요 내용을 요약합니다
          </p>
        </div>
        <button
          type="button"
          onClick={summarize}
          disabled={pending}
          className="shrink-0 rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-paper hover:bg-ink/85 disabled:opacity-50"
        >
          {pending ? "요약 중…" : summary ? "다시 요약" : "요약하기"}
        </button>
      </div>

      {error ? <p className="text-[11px] text-crimson">{error}</p> : null}
      {warning && !error ? (
        <p className="text-[11px] text-ink/45">{warning}</p>
      ) : null}

      {pending && !summary ? (
        <div className="rounded-lg border border-dashed border-ink/15 bg-paper px-3 py-4 text-xs text-ink/45">
          Gemini가 영상을 분석하는 중입니다. 잠시만 기다려 주세요…
        </div>
      ) : null}

      {summary ? (
        <div className="whitespace-pre-wrap rounded-lg border border-ink/10 bg-paper px-3 py-2.5 text-sm leading-relaxed text-ink">
          {summary}
        </div>
      ) : !pending && !error ? (
        <p className="text-[11px] text-ink/40">
          「요약하기」를 누르면 Google Gemini가 공개 영상의 핵심을 정리합니다.
        </p>
      ) : null}
    </div>
  );
}
