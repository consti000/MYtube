const YT_ID = /^[\w-]{11}$/;

/** YouTube URL에서 watch URL과 videoId를 뽑는다. 빈 값은 영상 없는 메모. */
export function parseYoutubeVideoInput(raw: string): {
  videoUrl: string;
  videoId: string | null;
} | null {
  const trimmed = raw.trim();
  if (!trimmed) return { videoUrl: "", videoId: null };

  try {
    const u = new URL(trimmed);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    let id: string | null = null;

    if (host === "youtu.be") {
      id = u.pathname.split("/").filter(Boolean)[0] ?? null;
    } else if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com"
    ) {
      id = u.searchParams.get("v");
      if (!id) {
        const parts = u.pathname.split("/").filter(Boolean);
        if (
          parts[0] === "embed" ||
          parts[0] === "shorts" ||
          parts[0] === "live"
        ) {
          id = parts[1] ?? null;
        }
      }
    } else {
      return null;
    }

    if (!id || !YT_ID.test(id)) return null;
    return {
      videoUrl: `https://www.youtube.com/watch?v=${id}`,
      videoId: id,
    };
  } catch {
    return null;
  }
}
