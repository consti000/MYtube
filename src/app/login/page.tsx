import { signIn } from "@/auth";

export default function LoginPage() {
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

        <form
          className="mt-10"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-3 rounded-xl bg-ink px-6 py-3.5 text-sm font-semibold text-paper shadow-lg transition hover:bg-ink/90"
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
