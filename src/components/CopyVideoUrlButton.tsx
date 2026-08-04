"use client";

import { useEffect, useState } from "react";

type Props = {
  videoId: string;
};

export function CopyVideoUrlButton({ videoId }: Props) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [videoId]);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <button
      type="button"
      onClick={copyUrl}
      title={url}
      className="min-w-0 max-w-full truncate rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-medium text-ink/65 hover:border-ink/30 hover:text-ink"
    >
      {copied ? "복사됨" : url}
    </button>
  );
}
