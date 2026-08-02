import { FolderDetailClient } from "@/components/FolderDetailClient";
import { AppNav } from "@/components/AppNav";

/** 로컬 UI 미리보기 — 로그인/API 없이 화면만 확인 */
export default function DemoPage() {
  const folders = [
    { id: "dev", name: "개발 / AI", count: 8 },
    { id: "music", name: "음악", count: 3 },
    { id: "news", name: "뉴스", count: 5 },
    { id: "uncat", name: "미분류", count: 4 },
  ];

  const videos = [
    {
      id: "1",
      videoId: "dQw4w9WgXcQ",
      title: "React Compiler deep dive",
      thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      publishedAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
      channelName: "Fireship",
    },
    {
      id: "2",
      videoId: "jNQXAC9IVRw",
      title: "Why your auth is broken",
      thumbnailUrl: "https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg",
      publishedAt: new Date(Date.now() - 5 * 3600_000).toISOString(),
      channelName: "Theo",
    },
    {
      id: "3",
      videoId: "M7lc1UVf-VE",
      title: "Server Actions in practice",
      thumbnailUrl: "https://i.ytimg.com/vi/M7lc1UVf-VE/hqdefault.jpg",
      publishedAt: new Date(Date.now() - 86400_000).toISOString(),
      channelName: "Web Dev Simplified",
    },
  ];

  const links = [
    {
      id: "l1",
      platform: "x" as const,
      name: "OpenAI",
      url: "https://x.com/OpenAI",
    },
    {
      id: "l2",
      platform: "x" as const,
      name: "Vercel",
      url: "https://x.com/vercel",
    },
    {
      id: "l3",
      platform: "facebook" as const,
      name: "Meta for Developers",
      url: "https://www.facebook.com/MetaforDevelopers",
    },
  ];

  return (
    <>
      <AppNav email="demo@mytube.local" youtubeConnected />
      <div className="border-b border-amber-500/30 bg-amber-50 px-4 py-1.5 text-center text-[11px] text-amber-900">
        UI 미리보기 (`/demo`) — 목업과 동일한 3열 레이아웃
      </div>
      <FolderDetailClient
        folder={{
          id: "dev",
          name: "개발 / AI",
          channelCount: 3,
          linkCount: links.length,
        }}
        folders={folders}
        videos={videos}
        links={links}
      />
    </>
  );
}
