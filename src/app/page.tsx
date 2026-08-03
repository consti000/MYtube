import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { AppNav } from "@/components/AppNav";
import {
  DashboardFoldersClient,
  type DashboardFolderCard,
} from "@/components/DashboardFoldersClient";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id;

  const folders = await prisma.folder.findMany({
    where: { userId },
    orderBy: { order: "asc" },
    include: {
      _count: { select: { channels: true, links: true } },
      channels: {
        include: {
          channel: {
            include: {
              videos: { orderBy: { publishedAt: "desc" }, take: 4 },
            },
          },
        },
      },
    },
  });

  const cards: DashboardFolderCard[] = folders.map((folder) => {
    const previews = folder.channels
      .flatMap((fc) => fc.channel.videos)
      .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
      .slice(0, 4)
      .map((v) => ({ id: v.id, thumbnailUrl: v.thumbnailUrl }));

    return {
      id: folder.id,
      name: folder.name,
      channelCount: folder._count.channels,
      linkCount: folder._count.links,
      previews,
    };
  });

  return (
    <>
      <AppNav email={session?.user?.email} />
      <main className="mx-auto max-w-7xl overflow-x-hidden px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
              대시보드
            </h1>
            <p className="mt-2 text-sm text-ink/55">
              폴더별 최신 유튜브 영상을 한눈에 보세요.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/folders"
              className="rounded-lg border border-ink/15 px-4 py-2 text-sm font-medium text-ink hover:border-ink/30"
            >
              폴더 관리
            </Link>
            <Link
              href="/settings"
              className="rounded-lg bg-crimson px-4 py-2 text-sm font-medium text-paper hover:bg-crimson/90"
            >
              동기화
            </Link>
          </div>
        </div>

        {cards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink/20 px-6 py-16 text-center">
            <p className="font-display text-xl text-ink">아직 폴더가 없습니다</p>
            <p className="mt-2 text-sm text-ink/50">
              폴더를 만들고 유튜브 채널을 배정한 뒤, 설정에서 구독을 동기화하세요.
            </p>
            <Link
              href="/folders"
              className="mt-6 inline-block rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-paper"
            >
              폴더 만들기
            </Link>
          </div>
        ) : (
          <DashboardFoldersClient initialFolders={cards} />
        )}
      </main>
    </>
  );
}
