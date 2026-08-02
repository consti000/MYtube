"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { SocialLinkButton } from "@/components/SocialLinkButton";
import { AddLinkModal } from "@/components/AddLinkModal";

export type FolderListItem = { id: string; name: string };
export type VideoItem = {
  id: string;
  videoId: string;
  title: string;
  thumbnailUrl: string | null;
  publishedAt: string | Date;
  channelName: string;
};
export type LinkItem = {
  id: string;
  platform: "x" | "facebook" | string;
  name: string;
  url: string;
};

type Props = {
  folder: {
    id: string;
    name: string;
    channelCount: number;
    linkCount: number;
  };
  folders: FolderListItem[];
  videos: VideoItem[];
  links: LinkItem[];
};

export function FolderDetailClient({ folder, folders, videos, links }: Props) {
  const [playing, setPlaying] = useState<VideoItem | null>(videos[0] ?? null);
  const [modalOpen, setModalOpen] = useState(false);

  const sortedVideos = useMemo(
    () =>
      [...videos].sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      ),
    [videos],
  );

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <aside className="hidden w-56 shrink-0 border-r border-ink/10 bg-paper/60 p-4 md:block">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink/40">
          폴더
        </p>
        <ul className="space-y-1">
          {folders.map((f) => {
            const active = f.id === folder.id;
            return (
              <li key={f.id}>
                <Link
                  href={`/folders/${f.id}`}
                  className={`block rounded-lg px-3 py-2 text-sm transition ${
                    active
                      ? "bg-crimson/10 font-semibold text-crimson"
                      : "text-ink/70 hover:bg-ink/5 hover:text-ink"
                  }`}
                >
                  {f.name}
                </Link>
              </li>
            );
          })}
        </ul>
        <Link
          href="/folders"
          className="mt-4 block rounded-lg border border-dashed border-ink/20 px-3 py-2 text-center text-xs text-ink/50 hover:border-crimson/40 hover:text-crimson"
        >
          폴더 관리
        </Link>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="border-b border-ink/10 px-4 py-5 sm:px-8">
          <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
            {folder.name}
          </h1>
          <p className="mt-1 text-sm text-ink/50">
            YouTube 채널 {folder.channelCount} · X/Facebook 링크 {folder.linkCount}
          </p>
        </div>

        <div className="grid gap-8 px-4 py-6 lg:grid-cols-[1fr_340px] sm:px-8">
          <div className="space-y-8">
            <section>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink/50">
                최신 영상
              </h2>
              {sortedVideos.length === 0 ? (
                <div className="rounded-xl border border-dashed border-ink/15 px-4 py-10 text-center text-sm text-ink/45">
                  이 폴더에 배정된 채널의 캐시된 영상이 없습니다. 설정에서 동기화를
                  실행하세요.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {sortedVideos.map((v) => {
                    const active = playing?.videoId === v.videoId;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setPlaying(v)}
                        className={`overflow-hidden rounded-xl border text-left transition ${
                          active
                            ? "border-crimson ring-2 ring-crimson/30"
                            : "border-ink/10 hover:border-ink/25"
                        }`}
                      >
                        <div className="aspect-video bg-ink/10">
                          {v.thumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={v.thumbnailUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="space-y-1 p-3">
                          <p className="line-clamp-2 text-sm font-medium text-ink">
                            {v.title}
                          </p>
                          <p className="text-xs text-ink/45">{v.channelName}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <section>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/50">
                  X · 페이스북 채널 링크
                </h2>
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-paper hover:bg-ink/85"
                >
                  <Plus className="h-3.5 w-3.5" />
                  링크 추가
                </button>
              </div>
              {links.length === 0 ? (
                <div className="rounded-xl border border-dashed border-ink/15 px-4 py-8 text-center text-sm text-ink/45">
                  등록된 링크가 없습니다. 북마크처럼 URL을 추가하세요.
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {links.map((l) => (
                    <SocialLinkButton
                      key={l.id}
                      platform={l.platform === "facebook" ? "facebook" : "x"}
                      name={l.name}
                      url={l.url}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            {playing ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
                  재생 중
                </p>
                <YouTubePlayer videoId={playing.videoId} title={playing.title} />
                <div>
                  <p className="font-medium text-ink">{playing.title}</p>
                  <p className="text-sm text-ink/50">{playing.channelName}</p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-ink/15 px-4 py-16 text-center text-sm text-ink/40">
                썸네일을 클릭하면 여기서 재생됩니다
              </div>
            )}
          </aside>
        </div>
      </div>

      <AddLinkModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        folders={folders}
        defaultFolderId={folder.id}
      />
    </div>
  );
}
