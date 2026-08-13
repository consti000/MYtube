"use client";

import { useEffect, useState } from "react";

type Props = {
  /** ISO 8601 문자열 */
  value: string;
  className?: string;
};

export function LocalDateTime({ value, className }: Props) {
  // 서버 런타임은 UTC라 SSR 단계에서는 보는 사람의 시간대를 알 수 없다.
  // 마운트 이후 브라우저 시간대로 포맷해 하이드레이션 불일치를 피한다.
  const [label, setLabel] = useState("");

  useEffect(() => {
    setLabel(
      new Date(value).toLocaleString("ko-KR", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    );
  }, [value]);

  return (
    <time dateTime={value} className={className}>
      {label}
    </time>
  );
}
