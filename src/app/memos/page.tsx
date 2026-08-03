import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { AppNav } from "@/components/AppNav";
import { MemosClient } from "@/components/MemosClient";

export default async function MemosPage() {
  const session = await auth();
  const userId = session!.user!.id;

  const memos = await prisma.memo.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <AppNav email={session?.user?.email} />
      <MemosClient
        initialMemos={memos.map((m) => ({
          id: m.id,
          content: m.content,
          videoUrl: m.videoUrl,
          videoTitle: m.videoTitle,
          videoId: m.videoId,
          createdAt: m.createdAt.toISOString(),
        }))}
      />
    </>
  );
}
