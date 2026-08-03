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

class YouTubeApiError extends Error {
  status: number;
  path: string;
  body: string;

  constructor(path: string, status: number, body: string) {
    super(`YouTube API ${path} failed: ${status} ${body}`);
    this.name = "YouTubeApiError";
    this.path = path;
    this.status = status;
    this.body = body;
  }

  get isPlaylistNotFound() {
    return (
      this.path === "playlistItems" &&
      (this.status === 404 || this.body.includes("playlistNotFound"))
    );
  }
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
    throw new YouTubeApiError(path, res.status, body);
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

async function resolveUploadsPlaylistId(
  token: string,
  channel: { id: string; externalChannelId: string },
): Promise<string | null> {
  const list = await ytGet<ChannelList>(token, "channels", {
    part: "contentDetails",
    id: channel.externalChannelId,
  });
  const playlistId =
    list.items?.[0]?.contentDetails?.relatedPlaylists?.uploads ?? null;
  await prisma.channel.update({
    where: { id: channel.id },
    data: { uploadsPlaylistId: playlistId },
  });
  return playlistId;
}

/** 누락된 uploads playlist ID를 최대 50개씩 일괄 조회 */
async function fillMissingPlaylistIds(
  token: string,
  userId: string,
  channels: Array<{ id: string; externalChannelId: string; uploadsPlaylistId: string | null }>,
) {
  const missing = channels.filter((c) => !c.uploadsPlaylistId);
  for (let i = 0; i < missing.length; i += 50) {
    const batch = missing.slice(i, i + 50);
    const list = await ytGet<ChannelList>(token, "channels", {
      part: "contentDetails",
      id: batch.map((c) => c.externalChannelId).join(","),
    });
    for (const ch of list.items ?? []) {
      const uploads = ch.contentDetails?.relatedPlaylists?.uploads ?? null;
      if (!ch.id) continue;
      await prisma.channel.updateMany({
        where: { userId, externalChannelId: ch.id },
        data: { uploadsPlaylistId: uploads },
      });
      const local = batch.find((c) => c.externalChannelId === ch.id);
      if (local) local.uploadsPlaylistId = uploads;
    }
  }
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => run()),
  );
  return results;
}

type SyncChannel = {
  id: string;
  name: string;
  externalChannelId: string;
  uploadsPlaylistId: string | null;
};

async function syncOneChannelVideos(
  token: string,
  channel: SyncChannel,
  perChannel: number,
): Promise<{ synced: number; skipped: boolean }> {
  let playlistId = channel.uploadsPlaylistId;
  if (!playlistId) {
    playlistId = await resolveUploadsPlaylistId(token, channel);
  }
  if (!playlistId) return { synced: 0, skipped: true };

  let page: PlaylistItems;
  try {
    page = await ytGet<PlaylistItems>(token, "playlistItems", {
      part: "snippet",
      playlistId,
      maxResults: String(perChannel),
    });
  } catch (err) {
    if (!(err instanceof YouTubeApiError) || !err.isPlaylistNotFound) throw err;
    playlistId = await resolveUploadsPlaylistId(token, channel);
    if (!playlistId) return { synced: 0, skipped: true };
    try {
      page = await ytGet<PlaylistItems>(token, "playlistItems", {
        part: "snippet",
        playlistId,
        maxResults: String(perChannel),
      });
    } catch (retryErr) {
      if (
        retryErr instanceof YouTubeApiError &&
        retryErr.isPlaylistNotFound
      ) {
        await prisma.channel.update({
          where: { id: channel.id },
          data: { uploadsPlaylistId: null },
        });
        return { synced: 0, skipped: true };
      }
      throw retryErr;
    }
  }

  const rows = (page.items ?? [])
    .map((item) => {
      const videoId = item.snippet?.resourceId?.videoId;
      const title = item.snippet?.title;
      const publishedAt = item.snippet?.publishedAt;
      if (!videoId || !title || !publishedAt) return null;
      return {
        channelId: channel.id,
        videoId,
        title,
        thumbnailUrl:
          item.snippet?.thumbnails?.medium?.url ??
          item.snippet?.thumbnails?.high?.url ??
          null,
        publishedAt: new Date(publishedAt),
        syncedAt: new Date(),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (!rows.length) return { synced: 0, skipped: false };

  // Neon HTTP 어댑터는 $transaction 미지원 → 순차 upsert
  for (const row of rows) {
    await prisma.videoCache.upsert({
      where: {
        channelId_videoId: {
          channelId: row.channelId,
          videoId: row.videoId,
        },
      },
      create: row,
      update: {
        title: row.title,
        thumbnailUrl: row.thumbnailUrl,
        publishedAt: row.publishedAt,
        syncedAt: row.syncedAt,
      },
    });
  }

  return { synced: rows.length, skipped: false };
}

/**
 * Cache latest videos.
 * 기본: 숨기지 않았고 폴더에 1개 이상 배정된 채널만 (속도·할당량 절약)
 * assignedOnly=false 이면 전체 구독 채널
 */
export async function syncVideoCache(
  userId: string,
  perChannel = 5,
  options?: { assignedOnly?: boolean; concurrency?: number },
) {
  const assignedOnly = options?.assignedOnly ?? true;
  const concurrency = options?.concurrency ?? 6;

  const token = await getYouTubeAccessToken(userId);
  const channels = await prisma.channel.findMany({
    where: {
      userId,
      platform: "youtube",
      hidden: false,
      ...(assignedOnly ? { folders: { some: {} } } : {}),
    },
    select: {
      id: true,
      name: true,
      externalChannelId: true,
      uploadsPlaylistId: true,
    },
  });

  await fillMissingPlaylistIds(token, userId, channels);

  const outcomes = await mapPool(channels, concurrency, async (channel) => {
    try {
      return await syncOneChannelVideos(token, channel, perChannel);
    } catch (err) {
      console.warn(
        `[youtube] skip channel ${channel.name}:`,
        err instanceof Error ? err.message : err,
      );
      return { synced: 0, skipped: true };
    }
  });

  const videoCount = outcomes.reduce((sum, o) => sum + o.synced, 0);
  const skippedCount = outcomes.filter((o) => o.skipped).length;

  return {
    videoCount,
    channelCount: channels.length,
    skippedCount,
  };
}
