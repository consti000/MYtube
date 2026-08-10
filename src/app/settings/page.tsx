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
        select: {
          id: true,
          refresh_token: true,
          expires_at: true,
        },
      },
    },
  });

  const google = user?.accounts[0];
  const accessExpired = google?.expires_at
    ? google.expires_at * 1000 < Date.now()
    : true;

  return (
    <>
      <AppNav email={session?.user?.email} />
      <SettingsClient
        email={user?.email ?? null}
        name={user?.name ?? null}
        image={user?.image ?? null}
        syncInterval={user?.syncInterval ?? 60}
        googleConnected={Boolean(google)}
        hasRefreshToken={Boolean(google?.refresh_token)}
        accessExpired={accessExpired}
      />
    </>
  );
}
