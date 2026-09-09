import type { JWT } from "next-auth/jwt";

/** 이 시간 동안 요청·입력이 없으면 세션을 만료한다. */
export const SESSION_IDLE_SECONDS = 10 * 60;
export const SESSION_IDLE_MS = SESSION_IDLE_SECONDS * 1000;

export const SESSION_ACTIVITY_EVENT = "mytube:session-activity";
export const SESSION_WATCHING_EVENT = "mytube:session-watching";

let watchingVideo = false;

/** 유튜브가 재생 중이면 유휴 로그아웃을 미룬다. */
export function isSessionWatching() {
  return watchingVideo;
}

export function setSessionWatching(watching: boolean) {
  watchingVideo = watching;
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(SESSION_WATCHING_EVENT, { detail: watching }),
  );
  if (watching) reportSessionActivity();
}

/** 재생 패널 등 부모 창으로 이벤트가 안 올라오는 활동을 알린다. */
export function reportSessionActivity() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SESSION_ACTIVITY_EVENT));
}

/** 클라이언트 타이머와 JWT lastActive를 함께 연장한다. */
export function keepSessionAlive() {
  reportSessionActivity();
  if (typeof window === "undefined") return;
  void fetch("/api/auth/session", { cache: "no-store" });
}

/**
 * JWT에 lastActive를 두고 유휴 시간을 검사한다.
 * 예전(유휴 추적 없는) 토큰은 바로 만료시켜 로그인 화면으로 보낸다.
 */
export function applySessionIdle(
  token: JWT,
  isNewSignIn: boolean,
): JWT | null {
  const now = Math.floor(Date.now() / 1000);
  if (isNewSignIn) {
    token.lastActive = now;
    return token;
  }
  if (
    typeof token.lastActive !== "number" ||
    now - token.lastActive > SESSION_IDLE_SECONDS
  ) {
    return null;
  }
  token.lastActive = now;
  return token;
}
