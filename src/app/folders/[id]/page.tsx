import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { AppNav } from "@/components/AppNav";
import { FolderDetailClient } from "@/components/FolderDetailClient";

type Props = { params: Promise<{ id: string }> };

export default async function FolderDetailPage({ params }: Props) {
  const session = await auth();
  const userId = session!.user!.id;
  const { id } = await params;

  const [folder, folders] = await Promise.all([
    prisma.folder.findFirst({
      where: { id, userId },
      include: {
        channels: {
          include: {
            channel: {
              include: {
                videos: { orderBy: { publishedAt: "desc" }, take: 10 },
              },
            },
          },
        },
        links: { include: { link: true }, orderBy: { order: "asc" } },
      },
    }),
    prisma.folder.findMany({
      where: { userId },
      orderBy: { order: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!folder) notFound();

  const videos = folder.channels
    .flatMap((fc) =>
      fc.channel.videos.map((v) => ({
        id: v.id,
        videoId: v.videoId,
        title: v.title,
        thumbnailUrl: v.thumbnailUrl,
        publishedAt: v.publishedAt.toISOString(),
        channelName: fc.channel.name,
      })),
    )
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );

  return (
    <>
      <AppNav email={session?.user?.email} />
      <FolderDetailClient
        folder={{
          id: folder.id,
          name: folder.name,
          channelCount: folder.channels.length,
          linkCount: folder.links.length,
        }}
        folders={folders}
        videos={videos}
        links={folder.links.map((fl) => ({
          id: fl.link.id,
          platform: fl.link.platform,
          name: fl.link.name,
          url: fl.link.url,
        }))}
      />
    </>
  );
}
