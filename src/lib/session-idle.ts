import type { JWT } from "next-auth/jwt";

/** 이 시간 동안 요청·입력이 없으면 세션을 만료한다. */
export const SESSION_IDLE_SECONDS = 3 * 60;
export const SESSION_IDLE_MS = SESSION_IDLE_SECONDS * 1000;

export const SESSION_ACTIVITY_EVENT = "mytube:session-activity";

/** 재생 패널 등 부모 창으로 이벤트가 안 올라오는 활동을 알린다. */
export function reportSessionActivity() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SESSION_ACTIVITY_EVENT));
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
