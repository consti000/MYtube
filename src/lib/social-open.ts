/** X / Facebook — Android 브라우저(삼성 인터넷·Chrome 등)에서 네이티브 앱으로 열기 */

const MOBILE_UA = /Android|iPhone|iPad|iPod|Mobile/i;
const ANDROID_UA = /Android/i;

const X_APP_PACKAGE = "com.twitter.android";
const FB_APP_PACKAGE = "com.facebook.katana";

const X_RESERVED = new Set([
  "home",
  "explore",
  "search",
  "notifications",
  "messages",
  "settings",
  "i",
  "intent",
  "share",
  "compose",
  "login",
  "signup",
  "tos",
  "privacy",
]);

export function isMobileUserAgent(ua = ""): boolean {
  return MOBILE_UA.test(ua);
}

export function isAndroidUserAgent(ua = ""): boolean {
  return ANDROID_UA.test(ua);
}

/** twitter.com → x.com, tracking 쿼리 제거 */
export function normalizeHttpsSocialUrl(
  platform: "x" | "facebook",
  raw: string,
): string {
  try {
    const u = new URL(raw.trim());
    if (platform === "x") {
      if (/^(www\.)?(twitter\.com|x\.com)$/i.test(u.hostname)) {
        u.protocol = "https:";
        u.hostname = "x.com";
        u.search = "";
        u.hash = "";
      }
    } else if (
      /^(www\.)?(facebook\.com|fb\.com|m\.facebook\.com)$/i.test(u.hostname)
    ) {
      u.protocol = "https:";
      u.hostname = "www.facebook.com";
      u.search = "";
      u.hash = "";
    }
    const out = u.toString();
    if (u.pathname !== "/" && out.endsWith("/")) return out.slice(0, -1);
    return out;
  } catch {
    return raw;
  }
}

export function extractXScreenName(url: string): string | null {
  try {
    const u = new URL(url);
    if (!/^(www\.)?(twitter\.com|x\.com)$/i.test(u.hostname)) return null;
    const seg = u.pathname.replace(/^\/+/, "").split("/")[0] ?? "";
    const name = seg.replace(/^@/, "");
    if (!name || X_RESERVED.has(name.toLowerCase())) return null;
    if (!/^[A-Za-z0-9_]{1,15}$/.test(name)) return null;
    return name;
  } catch {
    return null;
  }
}

/**
 * Android Intent URL (삼성 인터넷·Chrome 등 Chromium 계열에서 동작)
 * - 앱 설치 시 해당 패키지로 연결
 * - 미설치 시 S.browser_fallback_url 로 https 폴백
 */
function androidHttpsIntent(httpsUrl: string, packageName: string): string {
  const u = new URL(httpsUrl);
  const hostAndPath = `${u.host}${u.pathname}${u.search}`;
  const fallback = encodeURIComponent(httpsUrl);
  return `intent://${hostAndPath}#Intent;scheme=https;package=${packageName};S.browser_fallback_url=${fallback};end`;
}

function androidTwitterUserIntent(screenName: string, httpsUrl: string): string {
  const fallback = encodeURIComponent(httpsUrl);
  return `intent://user?screen_name=${encodeURIComponent(screenName)}#Intent;scheme=twitter;package=${X_APP_PACKAGE};S.browser_fallback_url=${fallback};end`;
}

/** 모바일에서 네이티브 앱 우선, 실패 시 https 폴백 */
export function openSocialLink(
  platform: "x" | "facebook",
  rawUrl: string,
): void {
  if (typeof window === "undefined") return;

  const https = normalizeHttpsSocialUrl(platform, rawUrl);
  const ua = navigator.userAgent;

  // PC: 새 탭
  if (!isMobileUserAgent(ua)) {
    window.open(https, "_blank", "noopener,noreferrer");
    return;
  }

  // —— Android ——
  if (isAndroidUserAgent(ua)) {
    if (platform === "x") {
      const screenName = extractXScreenName(https);
      // 1) App Links 스타일 Intent (가장 안정적)
      // 2) 실패 시 twitter 스킴 Intent
      try {
        window.location.assign(androidHttpsIntent(https, X_APP_PACKAGE));
        return;
      } catch {
        if (screenName) {
          window.location.assign(androidTwitterUserIntent(screenName, https));
          return;
        }
      }
    } else {
      try {
        window.location.assign(androidHttpsIntent(https, FB_APP_PACKAGE));
        return;
      } catch {
        /* fall through */
      }
    }
    window.location.assign(https);
    return;
  }

  // —— iOS 등 ——
  if (platform === "x") {
    const screenName = extractXScreenName(https);
    if (screenName) {
      navigateWithAppFallback(
        `twitter://user?screen_name=${encodeURIComponent(screenName)}`,
        https,
      );
      return;
    }
  }
  window.location.assign(https);
}

function navigateWithAppFallback(appUrl: string, httpsUrl: string) {
  let left = false;
  const onHide = () => {
    left = true;
  };
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", onHide);

  window.location.assign(appUrl);

  window.setTimeout(() => {
    document.removeEventListener("visibilitychange", onHide);
    window.removeEventListener("pagehide", onHide);
    if (!left && document.visibilityState === "visible") {
      window.location.assign(httpsUrl);
    }
  }, 900);
}
