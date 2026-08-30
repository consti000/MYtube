"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { SESSION_IDLE_MS } from "@/lib/session-idle";

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
    let timer = window.setTimeout(signOutIdle, SESSION_IDLE_MS);

    function signOutIdle() {
      void logoutAction();
    }

    function bump() {
      lastActive = Date.now();
      window.clearTimeout(timer);
      timer = window.setTimeout(signOutIdle, SESSION_IDLE_MS);
    }

    function onVisible() {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastActive >= SESSION_IDLE_MS) {
        signOutIdle();
        return;
      }
      bump();
    }

    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, bump, { passive: true });
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearTimeout(timer);
      for (const ev of ACTIVITY_EVENTS) {
        window.removeEventListener(ev, bump);
      }
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pathname]);

  return null;
}
