import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { AppNav } from "@/components/AppNav";
import { SettingsClient } from "@/components/SettingsClient";

export default async function SettingsPage() {
  const session = await auth();
  const userId = session!.user!.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      accounts: {
        where: { provider: "google" },
        select: { id: true },
      },
    },
  });

  return (
    <>
      <AppNav email={session?.user?.email} />
      <SettingsClient
        email={user?.email ?? null}
        name={user?.name ?? null}
        image={user?.image ?? null}
        syncInterval={user?.syncInterval ?? 60}
        googleConnected={(user?.accounts.length ?? 0) > 0}
      />
    </>
  );
}
