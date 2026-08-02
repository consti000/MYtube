import Link from "next/link";
import { signOut } from "@/auth";

type Props = {
  email?: string | null;
};

export function AppNav({ email }: Props) {
  return (
    <header className="border-b border-ink/10 bg-paper/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="font-display text-xl font-semibold tracking-tight text-ink">
          MY<span className="text-crimson">tube</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-ink/70 transition hover:text-ink">
            대시보드
          </Link>
          <Link href="/folders" className="text-ink/70 transition hover:text-ink">
            폴더 관리
          </Link>
          <Link href="/settings" className="text-ink/70 transition hover:text-ink">
            설정
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {email ? (
            <span className="hidden text-xs text-ink/45 sm:inline">{email}</span>
          ) : null}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-medium text-ink/70 hover:border-ink/30 hover:text-ink"
            >
              로그아웃
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
