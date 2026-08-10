"use client";

import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import { openSocialLink } from "@/lib/social-open";

type Props = {
  platform: "x" | "facebook";
  url: string;
  children: ReactNode;
  className?: string;
} & Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href" | "target" | "rel" | "onClick" | "children" | "className"
>;

/**
 * 데스크톱: 새 탭 https
 * 모바일: X/FB 앱 스킴·Intent 우선, 실패 시 같은 탭 https (Universal Link)
 */
export function SocialExternalLink({
  platform,
  url,
  children,
  className,
  ...rest
}: Props) {
  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    // 수정 키/휠클릭은 브라우저 기본 동작 유지
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    e.preventDefault();
    openSocialLink(platform, url);
  }

  return (
    <a
      href={url}
      onClick={onClick}
      className={className}
      {...rest}
    >
      {children}
    </a>
  );
}
