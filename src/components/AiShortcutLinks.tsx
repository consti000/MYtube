"use client";

type Props = {
  videoId: string;
  videoTitle: string;
};

function buildPrompt(videoTitle: string, videoUrl: string) {
  return `다음 유튜브 영상의 주요 내용을 요약해 주세요.\n제목: ${videoTitle}\nURL: ${videoUrl}`;
}

export function AiShortcutLinks({ videoId, videoTitle }: Props) {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const prompt = buildPrompt(videoTitle, videoUrl);
  const q = encodeURIComponent(prompt);

  const links = [
    {
      label: "Claude",
      href: `https://claude.ai/new?q=${q}`,
    },
    {
      label: "Gemini",
      href: `https://gemini.google.com/app?q=${q}`,
    },
    {
      label: "ChatGPT",
      href: `https://chatgpt.com/?q=${q}`,
    },
  ] as const;

  return (
    <div className="space-y-2 border-t border-ink/10 pt-3">
      <div>
        <p className="text-xs font-semibold text-ink">AI 바로가기</p>
        <p className="text-[11px] text-ink/40">
          재생 중 영상 정보를 담아 각 AI로 이동합니다
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-w-[6.75rem] items-center justify-center rounded-lg bg-crimson px-[1.125rem] py-1.5 text-xs font-bold text-paper hover:bg-crimson/90"
          >
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}
