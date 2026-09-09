"use client";

import { useEffect, useRef } from "react";
import {
  keepSessionAlive,
  setSessionWatching,
} from "@/lib/session-idle";

type Props = {
  videoId: string;
  title: string;
};

/** 시청 중 iframe 안 조작은 부모 창에 안 올라오므로, 세션을 주기적으로 연장한다. */
const WATCH_PING_MS = 30_000;
const YT_ORIGIN = "https://www.youtube.com";
/** 1 playing, 3 buffering */
const YT_ACTIVE = new Set([1, 3]);

function playerStateFromMessage(raw: unknown): number | undefined {
  if (typeof raw !== "string") return undefined;
  try {
    const data = JSON.parse(raw) as {
      info?: number | { playerState?: number };
    };
    if (typeof data.info === "number") return data.info;
    if (data.info && typeof data.info.playerState === "number") {
      return data.info.playerState;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function YouTubePlayer({ videoId, title }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playingRef = useRef(true);

  useEffect(() => {
    playingRef.current = true;
    setSessionWatching(true);
    keepSessionAlive();

    function pingWhileWatching() {
      if (!playingRef.current) return;
      keepSessionAlive();
    }

    function onMessage(event: MessageEvent) {
      if (event.origin !== YT_ORIGIN) return;
      const state = playerStateFromMessage(event.data);
      if (typeof state !== "number") return;
      const playing = YT_ACTIVE.has(state);
      playingRef.current = playing;
      setSessionWatching(playing);
      if (playing) keepSessionAlive();
    }

    function sendListen() {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "listening", id: videoId }),
        YT_ORIGIN,
      );
    }

    const iframe = iframeRef.current;
    iframe?.addEventListener("load", sendListen);
    sendListen();
    window.addEventListener("message", onMessage);
    const id = window.setInterval(pingWhileWatching, WATCH_PING_MS);

    return () => {
      iframe?.removeEventListener("load", sendListen);
      window.removeEventListener("message", onMessage);
      window.clearInterval(id);
      playingRef.current = false;
      setSessionWatching(false);
    };
  }, [videoId]);

  const src = new URL(`https://www.youtube.com/embed/${videoId}`);
  src.searchParams.set("autoplay", "1");
  src.searchParams.set("rel", "0");
  src.searchParams.set("enablejsapi", "1");
  // 메모 입력의 스페이스/방향키와 겹치지 않도록 플레이어 단축키를 끈다.
  src.searchParams.set("disablekb", "1");

  return (
    <div className="overflow-hidden rounded-xl bg-ink/90 shadow-inner">
      <div className="aspect-video w-full">
        <iframe
          ref={iframeRef}
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
