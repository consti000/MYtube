import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  FOLDER_VIDEO_LIMIT,
  folderVideoSince,
} from "@/lib/videos";
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
            channel: { select: { id: true, name: true } },
          },
        },
        links: { include: { link: true }, orderBy: { order: "asc" } },
      },
    }),
    prisma.folder.findMany({
      where: { userId },
      orderBy: { order: "asc" },
      select: {
        id: true,
        name: true,
        _count: { select: { channels: true, links: true } },
      },
    }),
  ]);

  if (!folder) notFound();

  const channelIds = folder.channels.map((fc) => fc.channel.id);
  const channelNameById = new Map(
    folder.channels.map((fc) => [fc.channel.id, fc.channel.name]),
  );

  const recentVideos =
    channelIds.length === 0
      ? []
      : await prisma.videoCache.findMany({
          where: {
            channelId: { in: channelIds },
            publishedAt: { gte: folderVideoSince() },
          },
          orderBy: { publishedAt: "desc" },
          take: FOLDER_VIDEO_LIMIT,
          select: {
            id: true,
            videoId: true,
            title: true,
            thumbnailUrl: true,
            publishedAt: true,
            channelId: true,
          },
        });

  const videos = recentVideos.map((v) => ({
    id: v.id,
    videoId: v.videoId,
    title: v.title,
    thumbnailUrl: v.thumbnailUrl,
    publishedAt: v.publishedAt.toISOString(),
    channelName: channelNameById.get(v.channelId) ?? "",
  }));

  const folderList = folders.map((f) => ({
    id: f.id,
    name: f.name,
    count: f._count.channels + f._count.links,
  }));

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
        folders={folderList}
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
