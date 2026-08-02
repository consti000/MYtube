"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";

type Props = {
  email?: string | null;
  youtubeConnected?: boolean;
};

export function AppNav({ email, youtubeConnected = true }: Props) {
  const pathname = usePathname();
  const onLibrary =
    pathname === "/" || pathname.startsWith("/folders/") || pathname === "/demo";

  return (
    <header className="border-b border-ink/10 bg-ink/[0.03]">
      <div className="flex h-12 items-center gap-4 px-4">
        <Link href="/" className="text-[15px] font-bold tracking-tight text-ink">
          MYtube
        </Link>
        <Link
          href="/"
          className={`text-[13px] ${
            onLibrary ? "font-semibold text-ink" : "font-normal text-ink/45"
          }`}
        >
          라이브러리
        </Link>
        <Link
          href="/folders"
          className={`text-[13px] ${
            pathname === "/folders"
              ? "font-semibold text-ink"
              : "font-normal text-ink/45"
          }`}
        >
          링크 관리
        </Link>
        <Link
          href="/settings"
          className={`text-[13px] ${
            pathname === "/settings"
              ? "font-semibold text-ink"
              : "font-normal text-ink/45"
          }`}
        >
          설정
        </Link>
        <div className="ml-auto flex items-center gap-3">
          {youtubeConnected ? (
            <span className="hidden rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 sm:inline">
              YouTube 연결됨
            </span>
          ) : null}
          {email ? (
            <span className="hidden text-xs text-ink/45 sm:inline">{email}</span>
          ) : null}
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-md px-2 py-1 text-xs text-ink/55 hover:bg-ink/5 hover:text-ink"
            >
              로그아웃
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
