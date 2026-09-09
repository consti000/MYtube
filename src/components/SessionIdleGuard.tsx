"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import {
  isSessionWatching,
  keepSessionAlive,
  SESSION_ACTIVITY_EVENT,
  SESSION_IDLE_MS,
  SESSION_WATCHING_EVENT,
} from "@/lib/session-idle";

const ACTIVITY_EVENTS = [
  "pointerdown",
  "keydown",
  "touchstart",
  "scroll",
] as const;

/** 로그인·데모 화면에서는 돌리지 않는다. */
const SKIP_PATHS = new Set(["/login", "/demo"]);

export function SessionIdleGuard() {
  const pathname = usePathname();

  useEffect(() => {
    if (SKIP_PATHS.has(pathname)) return;

    let lastActive = Date.now();
    let watching = isSessionWatching();
    let timer = window.setTimeout(signOutIdle, SESSION_IDLE_MS);

    function signOutIdle() {
      // 유튜브 전체화면 등에서는 부모 창 타이머가 숨겨진 채 만료될 수 있다.
      if (watching || isSessionWatching()) {
        keepSessionAlive();
        bump();
        return;
      }
      void logoutAction();
    }

    function bump() {
      lastActive = Date.now();
      window.clearTimeout(timer);
      timer = window.setTimeout(signOutIdle, SESSION_IDLE_MS);
    }

    function onVisible() {
      if (document.visibilityState !== "visible") return;
      if (watching || isSessionWatching()) {
        bump();
        return;
      }
      if (Date.now() - lastActive >= SESSION_IDLE_MS) {
        signOutIdle();
        return;
      }
      bump();
    }

    function onWatching(ev: Event) {
      watching = Boolean((ev as CustomEvent<boolean>).detail);
      if (watching) bump();
    }

    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, bump, { passive: true });
    }
    window.addEventListener(SESSION_ACTIVITY_EVENT, bump);
    window.addEventListener(SESSION_WATCHING_EVENT, onWatching);
    document.addEventListener("visibilitychange", onVisible);
    document.addEventListener("fullscreenchange", bump);

    return () => {
      window.clearTimeout(timer);
      for (const ev of ACTIVITY_EVENTS) {
        window.removeEventListener(ev, bump);
      }
      window.removeEventListener(SESSION_ACTIVITY_EVENT, bump);
      window.removeEventListener(SESSION_WATCHING_EVENT, onWatching);
      document.removeEventListener("visibilitychange", onVisible);
      document.removeEventListener("fullscreenchange", bump);
    };
  }, [pathname]);

  return null;
}
