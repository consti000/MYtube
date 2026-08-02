import { prisma } from "@/lib/db";
import { decryptToken, encryptToken } from "@/lib/crypto";

const YT = "https://www.googleapis.com/youtube/v3";

async function getGoogleAccount(userId: string) {
  return prisma.account.findFirst({
    where: { userId, provider: "google" },
  });
}

async function refreshAccessToken(userId: string, refreshToken: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID!,
      client_secret: process.env.AUTH_GOOGLE_SECRET!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to refresh Google token: ${res.status}`);
  }
  const json = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  const account = await getGoogleAccount(userId);
  if (account) {
    await prisma.account.update({
      where: { id: account.id },
      data: {
        access_token: encryptToken(json.access_token),
        expires_at: Math.floor(Date.now() / 1000) + json.expires_in,
      },
    });
  }
  return json.access_token;
}

export async function getYouTubeAccessToken(userId: string): Promise<string> {
  const account = await getGoogleAccount(userId);
  if (!account?.access_token) {
    throw new Error("Google account not linked");
  }
  const access = decryptToken(account.access_token);
  const expiresAt = account.expires_at ?? 0;
  const needsRefresh = expiresAt * 1000 < Date.now() + 60_000;
  if (!needsRefresh) return access;
  if (!account.refresh_token) return access;
  return refreshAccessToken(userId, decryptToken(account.refresh_token));
}

async function ytGet<T>(
  accessToken: string,
  path: string,
  params: Record<string, string>,
): Promise<T> {
  const url = new URL(`${YT}/${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YouTube API ${path} failed: ${res.status} ${body}`);
  }
  return res.json() as Promise<T>;
}

type SubscriptionPage = {
  nextPageToken?: string;
  items?: Array<{
    snippet?: {
      title?: string;
      resourceId?: { channelId?: string };
      thumbnails?: { default?: { url?: string }; medium?: { url?: string } };
    };
  }>;
};

type ChannelList = {
  items?: Array<{
    id?: string;
    contentDetails?: { relatedPlaylists?: { uploads?: string } };
  }>;
};

type PlaylistItems = {
  nextPageToken?: string;
  items?: Array<{
    snippet?: {
      title?: string;
      publishedAt?: string;
      resourceId?: { videoId?: string };
      thumbnails?: { medium?: { url?: string }; high?: { url?: string } };
    };
  }>;
};

/** Sync subscribed channels into DB. */
export async function syncSubscriptions(userId: string) {
  const token = await getYouTubeAccessToken(userId);
  let pageToken: string | undefined;
  const channelIds: string[] = [];

  do {
    const page = await ytGet<SubscriptionPage>(token, "subscriptions", {
      part: "snippet",
      mine: "true",
      maxResults: "50",
      ...(pageToken ? { pageToken } : {}),
    });

    for (const item of page.items ?? []) {
      const externalId = item.snippet?.resourceId?.channelId;
      const name = item.snippet?.title;
      if (!externalId || !name) continue;
      channelIds.push(externalId);
      const thumb =
        item.snippet?.thumbnails?.medium?.url ??
        item.snippet?.thumbnails?.default?.url;
      await prisma.channel.upsert({
        where: {
          userId_externalChannelId: { userId, externalChannelId: externalId },
        },
        create: {
          userId,
          platform: "youtube",
          externalChannelId: externalId,
          name,
          thumbnailUrl: thumb,
        },
        update: { name, thumbnailUrl: thumb },
      });
    }
    pageToken = page.nextPageToken;
  } while (pageToken);

  // Resolve uploads playlist ids in batches of 50
  for (let i = 0; i < channelIds.length; i += 50) {
    const batch = channelIds.slice(i, i + 50);
    const list = await ytGet<ChannelList>(token, "channels", {
      part: "contentDetails",
      id: batch.join(","),
    });
    for (const ch of list.items ?? []) {
      const uploads = ch.contentDetails?.relatedPlaylists?.uploads;
      if (!ch.id || !uploads) continue;
      await prisma.channel.updateMany({
        where: { userId, externalChannelId: ch.id },
        data: { uploadsPlaylistId: uploads },
      });
    }
  }

  return { channelCount: channelIds.length };
}

/** Cache latest videos for a user's channels (quota-friendly via uploads playlist). */
export async function syncVideoCache(userId: string, perChannel = 5) {
  const token = await getYouTubeAccessToken(userId);
  const channels = await prisma.channel.findMany({
    where: { userId, platform: "youtube" },
  });

  let synced = 0;
  for (const channel of channels) {
    let playlistId: string | null = channel.uploadsPlaylistId;
    if (!playlistId) {
      const list = await ytGet<ChannelList>(token, "channels", {
        part: "contentDetails",
        id: channel.externalChannelId,
      });
      playlistId =
        list.items?.[0]?.contentDetails?.relatedPlaylists?.uploads ?? null;
      if (playlistId) {
        await prisma.channel.update({
          where: { id: channel.id },
          data: { uploadsPlaylistId: playlistId },
        });
      }
    }
    if (!playlistId) continue;

    const page = await ytGet<PlaylistItems>(token, "playlistItems", {
      part: "snippet",
      playlistId,
      maxResults: String(perChannel),
    });

    for (const item of page.items ?? []) {
      const videoId = item.snippet?.resourceId?.videoId;
      const title = item.snippet?.title;
      const publishedAt = item.snippet?.publishedAt;
      if (!videoId || !title || !publishedAt) continue;
      const thumb =
        item.snippet?.thumbnails?.medium?.url ??
        item.snippet?.thumbnails?.high?.url;
      await prisma.videoCache.upsert({
        where: {
          channelId_videoId: { channelId: channel.id, videoId },
        },
        create: {
          channelId: channel.id,
          videoId,
          title,
          thumbnailUrl: thumb,
          publishedAt: new Date(publishedAt),
        },
        update: {
          title,
          thumbnailUrl: thumb,
          publishedAt: new Date(publishedAt),
          syncedAt: new Date(),
        },
      });
      synced += 1;
    }
  }

  return { videoCount: synced, channelCount: channels.length };
}
