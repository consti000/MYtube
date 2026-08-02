"use client";

import { ExternalLink } from "lucide-react";

type Props = {
  platform: "x" | "facebook";
  name: string;
  url: string;
};

function PlatformGlyph({ platform }: { platform: "x" | "facebook" }) {
  if (platform === "x") {
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-ink text-sm font-bold text-paper">
        𝕏
      </span>
    );
  }
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#1877F2] text-sm font-bold text-white">
      f
    </span>
  );
}

export function SocialLinkButton({ platform, name, url }: Props) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 rounded-xl border border-ink/10 bg-paper px-4 py-3 transition hover:border-crimson/40 hover:bg-crimson/[0.04]"
    >
      <PlatformGlyph platform={platform} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-ink">{name}</span>
        <span className="block truncate text-xs text-ink/45">
          {platform === "x" ? "X" : "Facebook"} · 새 탭에서 열기
        </span>
      </span>
      <ExternalLink className="h-4 w-4 shrink-0 text-ink/35 transition group-hover:text-crimson" />
    </a>
  );
}
