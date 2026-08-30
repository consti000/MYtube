"use client";

type Props = {
  videoId: string;
  title: string;
};

export function YouTubePlayer({ videoId, title }: Props) {
  const src = new URL(`https://www.youtube.com/embed/${videoId}`);
  src.searchParams.set("autoplay", "1");
  src.searchParams.set("rel", "0");
  // 메모 입력의 스페이스/방향키와 겹치지 않도록 플레이어 단축키를 끈다.
  src.searchParams.set("disablekb", "1");

  return (
    <div className="overflow-hidden rounded-xl bg-ink/90 shadow-inner">
      <div className="aspect-video w-full">
        <iframe
          key={videoId}
          title={title}
          src={src.toString()}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          tabIndex={-1}
          className="h-full w-full border-0"
        />
      </div>
    </div>
  );
}
