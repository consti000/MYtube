"use client";

import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import {
  isMobileUserAgent,
  openSocialLink,
  type SocialPlatform,
} from "@/lib/social-open";

type Props = {
  platform: SocialPlatform;
  url: string;
  children: ReactNode;
  className?: string;
} & Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href" | "target" | "rel" | "onClick" | "children" | "className"
>;

/**
 * 데스크톱: 브라우저가 새 탭에서 https를 연다 (window.open 팝업 차단을 피함)
 * 모바일: X/FB/YouTube 앱 스킴·Intent 우선, 실패 시 같은 탭 https
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
    if (!isMobileUserAgent(navigator.userAgent)) {
      return;
    }
    e.preventDefault();
    openSocialLink(platform, url);
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={className}
      {...rest}
    >
      {children}
    </a>
  );
}
