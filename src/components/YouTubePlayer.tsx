"use client";

import { useEffect, useRef } from "react";

type Props = {
  videoId: string;
  title: string;
};

export function YouTubePlayer({ videoId, title }: Props) {
  const ref = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.focus();
    }
  }, [videoId]);

  return (
    <div className="overflow-hidden rounded-xl bg-ink/90 shadow-inner">
      <div className="aspect-video w-full">
        <iframe
          ref={ref}
          key={videoId}
          title={title}
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="h-full w-full border-0"
        />
      </div>
    </div>
  );
}
