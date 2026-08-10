"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reconnectGoogleAction } from "@/app/actions/auth";

type Props = {
  email: string | null;
  name: string | null;
  image: string | null;
  syncInterval: number;
  googleConnected: boolean;
  hasRefreshToken: boolean;
  accessExpired: boolean;
};

const INTERVALS = [
  { value: 30, label: "30분" },
  { value: 60, label: "1시간" },
  { value: 180, label: "3시간" },
] as const;

export function SettingsClient({
  email,
  name,
  image,
  syncInterval,
  googleConnected,
  hasRefreshToken,
  accessExpired,
}: Props) {
  const router = useRouter();
  const [interval, setInterval] = useState(syncInterval);
  const [message, setMessage] = useState<string | null>(null);
  const [needsReauth, setNeedsReauth] = useState(
    googleConnected && (!hasRefreshToken || accessExpired),
  );
  const [busy, setBusy] = useState(false);

  async function saveInterval(value: number) {
    setInterval(value);
    setBusy(true);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ syncInterval: value }),
    });
    setBusy(false);
    setMessage(res.ok ? "동기화 주기가 저장되었습니다." : "저장 실패");
    router.refresh();
  }

  async function runSync(mode: "subscriptions" | "videos" | "all") {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    const data = (await res.json()) as {
      error?: string;
      needsReauth?: boolean;
      videoCount?: number;
      channelCount?: number;
      skippedCount?: number;
    };
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error ?? "동기화 실패");
      if (data.needsReauth) setNeedsReauth(true);
      return;
    }
    setNeedsReauth(false);
    setMessage(
      mode === "videos"
        ? `영상 캐시 ${data.videoCount ?? 0}건 · 대상 채널 ${data.channelCount ?? 0}${
            data.skippedCount ? ` · 건너뜀 ${data.skippedCount}` : ""
          }`
        : mode === "all"
          ? `구독 ${data.channelCount ?? 0} · 영상 ${data.videoCount ?? 0}${
              data.skippedCount ? ` · 건너뜀 ${data.skippedCount}` : ""
            }`
          : `구독 채널 ${data.channelCount ?? 0}개 동기화`,
    );
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-10 px-4 py-8 sm:px-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">설정</h1>
        <p className="mt-2 text-sm text-ink/55">계정 연동과 유튜브 캐시 동기화</p>
      </div>

      <section className="rounded-2xl border border-ink/10 bg-paper p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/45">
          Google 계정
        </h2>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="h-12 w-12 rounded-full" />
          ) : (
            <div className="h-12 w-12 rounded-full bg-ink/10" />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-medium text-ink">{name ?? "사용자"}</p>
            <p className="text-sm text-ink/50">{email}</p>
            <p className="mt-1 text-xs text-ink/40">
              {googleConnected
                ? hasRefreshToken
                  ? "YouTube 읽기 권한 연결됨"
                  : "연결됨 · 갱신 토큰 없음 (재연결 필요)"
                : "연결 정보 없음"}
            </p>
          </div>
          <form action={reconnectGoogleAction}>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg border border-ink/15 px-3 py-2 text-xs font-medium text-ink hover:border-ink/30 disabled:opacity-50"
            >
              Google 다시 연결
            </button>
          </form>
        </div>
        {needsReauth ? (
          <p className="mt-3 rounded-lg border border-crimson/25 bg-crimson/[0.04] px-3 py-2 text-xs leading-relaxed text-crimson">
            YouTube API 권한이 만료되었을 수 있습니다. 「Google 다시 연결」로
            동의 화면을 완료한 뒤 다시 동기화하세요. Google Cloud 동의 화면이
            테스트 모드면 refresh 토큰이 약 7일 후 만료될 수 있습니다.
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-ink/10 bg-paper p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/45">
          영상 캐시 동기화 주기
        </h2>
        <p className="mt-2 text-sm text-ink/55">
          실시간 API 호출 대신 캐시를 갱신합니다. (할당량 절약)
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {INTERVALS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={busy}
              onClick={() => saveInterval(opt.value)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                interval === opt.value
                  ? "border-crimson bg-crimson text-paper"
                  : "border-ink/15 text-ink hover:border-ink/30"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-ink/10 bg-paper p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/45">
          지금 동기화
        </h2>
        <p className="mt-2 text-sm text-ink/55">
          영상 캐시는 폴더에 배정된 채널만 대상으로 하며, 여러 채널을 동시에
          가져옵니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => runSync("subscriptions")}
            className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink/85 disabled:opacity-50"
          >
            구독 목록
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => runSync("videos")}
            className="rounded-lg border border-ink/15 px-4 py-2 text-sm font-medium text-ink hover:border-ink/30 disabled:opacity-50"
          >
            영상 캐시
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => runSync("all")}
            className="rounded-lg border border-crimson/40 px-4 py-2 text-sm font-medium text-crimson hover:bg-crimson/5 disabled:opacity-50"
          >
            전체 동기화
          </button>
        </div>
        {message ? (
          <p
            className={`mt-3 text-sm ${
              needsReauth ? "text-crimson" : "text-ink/60"
            }`}
          >
            {message}
          </p>
        ) : null}
      </section>
    </div>
  );
}
