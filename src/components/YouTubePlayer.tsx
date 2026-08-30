"use client";

import { useEffect } from "react";
import { reportSessionActivity } from "@/lib/session-idle";

type Props = {
  videoId: string;
  title: string;
};

/** 시청 중 iframe 안 조작은 부모 창에 안 올라오므로, 세션을 주기적으로 연장한다. */
const WATCH_PING_MS = 60_000;

function pingWhileWatching() {
  if (document.visibilityState !== "visible") return;
  reportSessionActivity();
  void fetch("/api/auth/session", { cache: "no-store" });
}

export function YouTubePlayer({ videoId, title }: Props) {
  useEffect(() => {
    pingWhileWatching();
    const id = window.setInterval(pingWhileWatching, WATCH_PING_MS);
    return () => window.clearInterval(id);
  }, [videoId]);

  const src = new URL(`https://www.youtube.com/embed/${videoId}`);
  src.searchParams.set("autoplay", "1");
  src.searchParams.set("rel", "0");
  // 메모 입력의 스페이스/방향키와 겹치지 않도록 플레이어 단축키를 끈다.
  src.searchParams.set("disablekb", "1");

  return (
    <div className="overflow-hidden rounded-xl bg-ink/90 shadow-inner">
      <div className="aspect-video w-full">
        <iframe
          key={videoId}
          title={title}
          src={src.toString()}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          tabIndex={-1}
          className="h-full w-full border-0"
        />
      </div>
    </div>
  );
}
