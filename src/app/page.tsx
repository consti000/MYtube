import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { AppNav } from "@/components/AppNav";

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

  return (
    <>
      <AppNav email={session?.user?.email} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
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

        {folders.length === 0 ? (
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
          <div className="flex gap-5 overflow-x-auto pb-4">
            {folders.map((folder) => {
              const previews = folder.channels
                .flatMap((fc) =>
                  fc.channel.videos.map((v) => ({
                    ...v,
                    channelName: fc.channel.name,
                  })),
                )
                .sort(
                  (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime(),
                )
                .slice(0, 4);

              return (
                <Link
                  key={folder.id}
                  href={`/folders/${folder.id}`}
                  className="w-[280px] shrink-0 rounded-2xl border border-ink/10 bg-paper p-4 transition hover:border-crimson/35 hover:shadow-md sm:w-[300px]"
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <h2 className="font-display text-lg font-semibold text-ink">
                      {folder.name}
                    </h2>
                    <span className="text-[11px] text-ink/40">
                      YT {folder._count.channels} · 링크 {folder._count.links}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {previews.length === 0 ? (
                      <p className="col-span-2 py-8 text-center text-xs text-ink/40">
                        미리볼 영상 없음
                      </p>
                    ) : (
                      previews.map((v) => (
                        <div
                          key={v.id}
                          className="overflow-hidden rounded-lg bg-ink/5"
                        >
                          <div className="aspect-video">
                            {v.thumbnailUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={v.thumbnailUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
