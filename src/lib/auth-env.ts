/** Vercel에서 AUTH_URL이 http로 들어가면 Google redirect_uri_mismatch가 납니다. */
export function normalizeAuthEnv() {
  const url = process.env.AUTH_URL?.trim();
  if (!url) return;

  try {
    const parsed = new URL(url);
    const onVercel = Boolean(process.env.VERCEL);
    if (onVercel && parsed.protocol === "http:") {
      parsed.protocol = "https:";
      process.env.AUTH_URL = parsed.origin;
    } else {
      // Auth.js는 origin만 필요 (pathname / trailing slash 제거)
      process.env.AUTH_URL = parsed.origin;
    }
  } catch {
    // 잘못된 URL은 Auth.js assertConfig에서 처리
  }
}
