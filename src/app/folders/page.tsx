import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { AppNav } from "@/components/AppNav";
import { FolderManageClient } from "@/components/FolderManageClient";

export default async function FoldersPage() {
  const session = await auth();
  const userId = session!.user!.id;

  const [folders, channels] = await Promise.all([
    prisma.folder.findMany({
      where: { userId },
      orderBy: { order: "asc" },
      select: { id: true, name: true },
    }),
    prisma.channel.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        thumbnailUrl: true,
        hidden: true,
        folders: { include: { folder: { select: { id: true, name: true } } } },
      },
    }),
  ]);

  return (
    <>
      <AppNav email={session?.user?.email} />
      <FolderManageClient initialFolders={folders} channels={channels} />
    </>
  );
}
