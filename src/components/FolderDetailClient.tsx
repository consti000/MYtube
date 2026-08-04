"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { AddLinkModal } from "@/components/AddLinkModal";
import { VideoMemoBox } from "@/components/VideoMemoBox";

export type FolderListItem = { id: string; name: string; count?: number };
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

function formatWhen(date: string | Date) {
  const t = new Date(date).getTime();
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d === 1) return "어제";
  return `${d}일 전`;
}

function handleFromUrl(url: string, platform: string) {
  try {
    const u = new URL(url);
    const seg = u.pathname.replace(/^\/+/, "").split("/")[0] || u.hostname;
    if (platform === "x") return seg.startsWith("@") ? seg : `@${seg}`;
    return `${u.hostname.replace(/^www\./, "")}/${seg}`;
  } catch {
    return url;
  }
}

function PlatformMark({ platform }: { platform: "youtube" | "x" | "facebook" }) {
  const label = platform === "youtube" ? "YT" : platform === "x" ? "X" : "FB";
  return (
    <span className="inline-flex h-[18px] min-w-[22px] items-center justify-center rounded-[3px] bg-ink/10 px-[5px] text-[10px] font-bold tracking-wide text-ink/60">
      {label}
    </span>
  );
}

export function FolderDetailClient({ folder, folders, videos, links }: Props) {
  const sortedVideos = useMemo(
    () =>
      [...videos].sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      ),
    [videos],
  );

  const [playingId, setPlayingId] = useState<string | null>(
    sortedVideos[0]?.id ?? null,
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const playerPanelRef = useRef<HTMLElement>(null);

  const playing = sortedVideos.find((v) => v.id === playingId) ?? null;

  function scrollToPlayer() {
    // 목록 아래/옆 재생 패널로 이동 (좁은 화면에서 특히 유용)
    requestAnimationFrame(() => {
      playerPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function selectVideo(id: string) {
    setPlayingId(id);
    scrollToPlayer();
  }

  function openAddModal() {
    setModalMode("add");
    setModalOpen(true);
  }

  function openEditModal() {
    if (!links.length) return;
    setModalMode("edit");
    setModalOpen(true);
  }

  function playNext() {
    if (!playing) return;
    const idx = sortedVideos.findIndex((v) => v.id === playing.id);
    const next = sortedVideos[idx + 1] ?? sortedVideos[0];
    if (next) selectVideo(next.id);
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col overflow-x-hidden md:grid md:grid-cols-[minmax(160px,200px)_minmax(0,1fr)] md:items-start xl:grid-cols-[minmax(160px,200px)_minmax(0,1fr)_minmax(300px,40%)]">
      {/* Left: folders */}
      <aside className="hidden border-r border-ink/10 bg-ink/[0.02] p-3 md:sticky md:top-12 md:block md:max-h-[calc(100vh-3rem)] md:self-start md:overflow-y-auto">
        <p className="text-xs font-semibold text-ink/50">주제 폴더</p>
        <ul className="mt-2.5 space-y-1">
          {folders.map((f) => {
            const active = f.id === folder.id;
            return (
              <li key={f.id}>
                <Link
                  href={`/folders/${f.id}`}
                  className={`flex items-center justify-between rounded-md px-2.5 py-2 text-[13px] transition ${
                    active
                      ? "bg-ink/10 font-semibold text-ink"
                      : "font-normal text-ink/70 hover:bg-ink/5"
                  }`}
                >
                  <span className="truncate">{f.name}</span>
                  {typeof f.count === "number" ? (
                    <span className="text-[11px] text-ink/40">{f.count}</span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="my-3.5 h-px bg-ink/10" />
        <Link
          href="/folders"
          className="block w-full rounded-lg border border-ink/15 bg-paper px-3 py-2 text-center text-xs font-medium text-ink/70 hover:border-ink/30 hover:text-ink"
        >
          + 새 폴더
        </Link>
      </aside>

      {/* Center: lists */}
      <main className="min-w-0 border-r border-ink/10 p-4">
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[15px] font-semibold text-ink">{folder.name}</h1>
            <p className="text-xs text-ink/45">
              YouTube {sortedVideos.length} · X/FB 링크 {links.length}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/settings"
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-ink/60 hover:bg-ink/5"
            >
              동기화
            </Link>
            <Link
              href="/folders"
              className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-medium text-ink/70 hover:border-ink/30"
            >
              채널 배정
            </Link>
          </div>
        </div>

        {/* YouTube rows */}
        <section className="mb-4 space-y-2">
          <div className="mb-2 flex items-center gap-2">
            <h2 className="text-xs font-semibold text-ink">YouTube 영상</h2>
            <span className="text-xs text-ink/40">클릭 시 우측에서 바로 재생</span>
          </div>
          {sortedVideos.length === 0 ? (
            <div className="rounded-lg border border-dashed border-ink/15 bg-ink/[0.02] px-3 py-8 text-center text-xs text-ink/45">
              캐시된 영상이 없습니다. 설정에서 동기화하세요.
            </div>
          ) : (
            sortedVideos.map((v) => {
              const active = playingId === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => selectVideo(v.id)}
                  className={`grid w-full grid-cols-[112px_1fr] gap-3 rounded-lg border p-2 text-left transition ${
                    active
                      ? "border-crimson bg-crimson/[0.06]"
                      : "border-transparent bg-ink/[0.03] hover:bg-ink/[0.06]"
                  }`}
                >
                  <div className="relative flex h-[63px] items-center justify-center overflow-hidden rounded-md bg-ink/10">
                    {v.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={v.thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                    <div className="absolute flex h-7 w-7 items-center justify-center rounded-full bg-ink/70">
                      <div className="ml-0.5 h-0 w-0 border-y-[5px] border-l-[8px] border-y-transparent border-l-paper" />
                    </div>
                  </div>
                  <div className="flex flex-col justify-center gap-1">
                    <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-ink">
                      {v.title}
                    </p>
                    <p className="text-[11px] text-ink/45">
                      {v.channelName} · {formatWhen(v.publishedAt)}
                    </p>
                    <div>
                      <PlatformMark platform="youtube" />
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </section>

        <div className="my-3.5 h-px bg-ink/10" />

        {/* X / Facebook link buttons */}
        <section className="mt-3.5 space-y-2">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-semibold text-ink">X · Facebook</h2>
              <span className="text-xs text-ink/40">
                저장해 둔 페이지 URL — 클릭 시 새 탭
              </span>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={openAddModal}
                className="rounded-lg bg-ink px-2.5 py-1 text-[11px] font-medium text-paper hover:bg-ink/85"
              >
                + 링크 추가
              </button>
              <button
                type="button"
                onClick={openEditModal}
                disabled={!links.length}
                className="rounded-lg border border-ink/15 bg-paper px-2.5 py-1 text-[11px] font-medium text-ink/70 hover:border-ink/30 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
              >
                링크 수정
              </button>
            </div>
          </div>
          {links.length === 0 ? (
            <div className="rounded-lg border border-dashed border-ink/15 bg-ink/[0.02] px-3 py-3 text-xs text-ink/50">
              이 폴더에 등록된 X/Facebook 링크가 없습니다. 링크 추가에서 URL을
              등록하세요.
            </div>
          ) : (
            links.map((s) => {
              const platform = s.platform === "facebook" ? "facebook" : "x";
              return (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center gap-2.5 rounded-lg border border-ink/15 bg-paper px-3 py-2.5 text-left transition hover:border-ink/25"
                >
                  <PlatformMark platform={platform} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-ink">
                      {s.name}
                    </span>
                    <span className="block truncate text-[11px] text-ink/40">
                      {handleFromUrl(s.url, platform)}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] font-semibold text-crimson">
                    열기 →
                  </span>
                </a>
              );
            })
          )}
        </section>
      </main>

      {/* Right: player — xl 이상에서만 옆 고정, 그 아래 폭에서는 목록 아래로 */}
      <aside
        ref={playerPanelRef}
        id="playback-panel"
        className="min-w-0 scroll-mt-14 border-t border-ink/10 bg-ink/[0.02] p-3.5 md:col-span-2 xl:col-span-1 xl:col-start-3 xl:row-start-1 xl:sticky xl:top-12 xl:max-h-[calc(100vh-3rem)] xl:self-start xl:overflow-y-auto xl:border-t-0"
      >
        {playing ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-ink">재생 패널</p>
            <YouTubePlayer videoId={playing.videoId} title={playing.title} />
            <div>
              <p className="font-semibold text-ink">{playing.title}</p>
              <p className="text-xs text-ink/45">
                {playing.channelName} · {formatWhen(playing.publishedAt)}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={playNext}
                className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-medium text-ink/70 hover:border-ink/30"
              >
                다음 영상
              </button>
              <a
                href={`https://www.youtube.com/watch?v=${playing.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-ink/55 hover:bg-ink/5"
              >
                원본
              </a>
            </div>
            <VideoMemoBox videoId={playing.videoId} videoTitle={playing.title} />
          </div>
        ) : (
          <p className="text-xs text-ink/40">영상을 선택하세요</p>
        )}
      </aside>

      <AddLinkModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        folders={folders}
        defaultFolderId={folder.id}
        mode={modalMode}
        links={links}
      />
    </div>
  );
}
