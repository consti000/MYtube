import { redirect } from "next/navigation";
import { signIn } from "@/auth";

function googleOAuthConfigured() {
  const id = process.env.AUTH_GOOGLE_ID?.trim() ?? "";
  const secret = process.env.AUTH_GOOGLE_SECRET?.trim() ?? "";
  const idOk = id.includes(".apps.googleusercontent.com");
  const secretOk = secret.length >= 10 && !secret.includes("@");
  return idOk && secretOk;
}

type Props = {
  searchParams: Promise<{ error?: string }>;
};

function AuthErrorBanner({ error }: { error?: string }) {
  if (!error || error === "config") return null;

  const isAccessDenied =
    error === "AccessDenied" ||
    error === "access_denied" ||
    error.toLowerCase().includes("access");

  if (isAccessDenied) {
    return (
      <div className="mt-8 rounded-xl border border-crimson/30 bg-crimson/5 px-4 py-4 text-left text-sm text-ink/80">
        <p className="font-semibold text-crimson">
          Google이 로그인을 차단했습니다 (테스트 사용자 필요)
        </p>
        <p className="mt-2 leading-relaxed">
          OAuth 동의 화면이 <strong>테스트</strong> 상태일 때는, 개발자가 등록한
          테스트 사용자만 로그인할 수 있습니다. 앱 코드 문제가 아니라{" "}
          <strong>Google Cloud 설정</strong> 문제입니다.
        </p>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-ink/65">
          <li>
            <a
              className="text-crimson underline"
              href="https://console.cloud.google.com/apis/credentials/consent"
              target="_blank"
              rel="noreferrer"
            >
              OAuth 동의 화면
            </a>
            으로 이동
          </li>
          <li>
            아래쪽 <strong>테스트 사용자</strong> → <strong>ADD USERS</strong>
          </li>
          <li>
            로그인에 쓸 Gmail을 추가 (예: 지금 쓰려던 계정) 후 저장
          </li>
          <li>1~2분 뒤 다시 「Google로 계속하기」 클릭</li>
        </ol>
        <p className="mt-3 text-xs text-ink/45">
          개인용으로만 쓸 거면 앱을 “프로덕션”으로 올릴 필요는 없습니다. 테스트
          사용자만 추가하면 됩니다.
        </p>
      </div>
    );
  }

  if (error === "Configuration") {
    return (
      <div className="mt-8 rounded-xl border border-crimson/30 bg-crimson/5 px-4 py-4 text-left text-sm text-ink/80">
        <p className="font-semibold text-crimson">서버 설정 오류 (Configuration)</p>
        <p className="mt-2 leading-relaxed">
          Google까지는 통과했지만, 앱이 콜백을 처리하지 못했습니다. Vercel 환경
          변수와 DB를 확인하세요.
        </p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-ink/65">
          <li>
            <code className="rounded bg-ink/5 px-1">AUTH_URL</code> ={" "}
            <code className="rounded bg-ink/5 px-1">https://…</code> (반드시 https)
          </li>
          <li>
            <code className="rounded bg-ink/5 px-1">AUTH_SECRET</code> 존재 여부
          </li>
          <li>
            <code className="rounded bg-ink/5 px-1">DATABASE_URL</code> / Neon 연결
          </li>
          <li>
            Google 리디렉션 URI ={" "}
            <code className="rounded bg-ink/5 px-1">
              https://도메인/api/auth/callback/google
            </code>
          </li>
        </ul>
        <p className="mt-3 text-xs text-ink/45">
          환경 변수 수정 후 Vercel에서 Redeploy 한 뒤 다시 시도하세요.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-xl border border-crimson/30 bg-crimson/5 px-4 py-4 text-left text-sm text-ink/80">
      <p className="font-semibold text-crimson">로그인에 실패했습니다</p>
      <p className="mt-2 text-ink/65">
        오류 코드: <code className="rounded bg-ink/5 px-1">{error}</code>
      </p>
      <p className="mt-2 text-xs text-ink/45">
        OAuth 클라이언트 ID/시크릿, 리디렉션 URI, 테스트 사용자를 다시 확인해
        주세요.
      </p>
    </div>
  );
}

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const configured = googleOAuthConfigured();
  const showConfigError = params.error === "config" || !configured;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[55vh] bg-[url('https://images.unsplash.com/photo-1611162616475-46b635cb4953?auto=format&fit=crop&w=1600&q=60')] bg-cover bg-center opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-b from-paper/40 via-paper/90 to-paper" />
      </div>

      <div className="w-full max-w-md text-center">
        <p className="font-display text-5xl font-semibold tracking-tight text-ink sm:text-6xl">
          MY<span className="text-crimson">tube</span>
        </p>
        <p className="mt-4 text-base text-ink/60 sm:text-lg">
          관심 채널을 주제별 폴더로 모으고, 폴더 안에서 바로 재생하세요.
        </p>

        {showConfigError ? (
          <div className="mt-8 rounded-xl border border-crimson/30 bg-crimson/5 px-4 py-4 text-left text-sm text-ink/80">
            <p className="font-semibold text-crimson">Google OAuth 설정이 필요합니다</p>
            <p className="mt-2 leading-relaxed">
              Vercel에 배포된 경우, 로컬 <code className="rounded bg-ink/5 px-1">.env</code>가
              자동으로 올라가지 않습니다.{" "}
              <strong>Vercel → Project → Settings → Environment Variables</strong>에
              아래 값을 넣어야 합니다.
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-ink/65">
              <li>
                <code className="rounded bg-ink/5 px-1">AUTH_GOOGLE_ID</code> —{" "}
                <code className="rounded bg-ink/5 px-1">*.apps.googleusercontent.com</code>
              </li>
              <li>
                <code className="rounded bg-ink/5 px-1">AUTH_GOOGLE_SECRET</code> —{" "}
                <code className="rounded bg-ink/5 px-1">GOCSPX-…</code>
              </li>
              <li>
                <code className="rounded bg-ink/5 px-1">AUTH_SECRET</code> — 긴 임의 문자열
              </li>
              <li>
                <code className="rounded bg-ink/5 px-1">AUTH_URL</code> — 지금 사이트 주소
                (예: <code className="rounded bg-ink/5 px-1">https://mytube.vercel.app</code>)
              </li>
              <li>
                <code className="rounded bg-ink/5 px-1">DATABASE_URL</code> — Neon 연결 문자열
              </li>
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-ink/55">
              Google Cloud OAuth 리디렉션 URI에도{" "}
              <code className="rounded bg-ink/5 px-1">
                https://내주소.vercel.app/api/auth/callback/google
              </code>
              를 추가한 뒤, 환경 변수 저장 후 <strong>Redeploy</strong> 하세요.
            </p>
            <p className="mt-3 text-xs text-ink/45">
              UI만 먼저 보려면{" "}
              <a href="/demo" className="text-crimson underline">
                /demo
              </a>
              를 이용하세요.
            </p>
          </div>
        ) : (
          <AuthErrorBanner error={params.error} />
        )}

        {!showConfigError && !params.error ? (
          <div className="mt-8 rounded-xl border border-ink/10 bg-paper/80 px-4 py-3 text-left text-xs text-ink/55">
            테스트 모드에서는{" "}
            <a
              href="https://console.cloud.google.com/apis/credentials/consent"
              className="text-crimson underline"
              target="_blank"
              rel="noreferrer"
            >
              OAuth 동의 화면 → 테스트 사용자
            </a>
            에 본인 Gmail을 추가해야 로그인됩니다.
          </div>
        ) : null}

        <form
          className="mt-8"
          action={async () => {
            "use server";
            if (!googleOAuthConfigured()) {
              redirect("/login?error=config");
            }
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            disabled={!configured}
            className="inline-flex w-full items-center justify-center gap-3 rounded-xl bg-ink px-6 py-3.5 text-sm font-semibold text-paper shadow-lg transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="#fff"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#fff"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#fff"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#fff"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google로 계속하기
          </button>
        </form>

        <p className="mt-6 text-xs leading-relaxed text-ink/40">
          Google 로그인으로 YouTube 구독 목록을 불러옵니다. X·Facebook은 API 없이
          링크만 직접 등록합니다.
        </p>
      </div>
    </main>
  );
}
