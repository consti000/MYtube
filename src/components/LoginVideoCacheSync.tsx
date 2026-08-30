"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Status = "running" | "done" | "error";

export function LoginVideoCacheSync() {
  const router = useRouter();
  const started = useRef(false);
  const [status, setStatus] = useState<Status>("running");

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "videos" }),
        });
        if (cancelled) return;
        setStatus(res.ok ? "done" : "error");
      } catch {
        if (!cancelled) setStatus("error");
      } finally {
        if (cancelled) return;
        router.replace("/");
        router.refresh();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (status === "error") {
    return (
      <p className="text-xs text-crimson sm:text-sm">영상 캐시 실패</p>
    );
  }

  return (
    <p className="text-xs text-ink/45 sm:text-sm">
      {status === "running" ? "영상 캐시 불러오는 중…" : "영상 캐시 완료"}
    </p>
  );
}
