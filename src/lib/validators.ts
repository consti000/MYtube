import { z } from "zod";

const X_URL = /^https?:\/\/(www\.)?(x\.com|twitter\.com)\/.+/i;
const FB_URL = /^https?:\/\/(www\.)?(facebook\.com|fb\.com)\/.+/i;

export const linkInputSchema = z
  .object({
    platform: z.enum(["x", "facebook"]),
    name: z.string().trim().min(1).max(100),
    url: z.string().trim().url(),
    folderIds: z.array(z.string()).min(1),
  })
  .superRefine((data, ctx) => {
    const ok =
      data.platform === "x" ? X_URL.test(data.url) : FB_URL.test(data.url);
    if (!ok) {
      ctx.addIssue({
        code: "custom",
        path: ["url"],
        message:
          data.platform === "x"
            ? "URL must be an x.com or twitter.com link"
            : "URL must be a facebook.com link",
      });
    }
  });

export const linkBulkRowSchema = z
  .object({
    platform: z.enum(["x", "facebook"]),
    name: z.string().trim().min(1).max(100),
    url: z.string().trim().url(),
  })
  .superRefine((data, ctx) => {
    const ok =
      data.platform === "x" ? X_URL.test(data.url) : FB_URL.test(data.url);
    if (!ok) {
      ctx.addIssue({
        code: "custom",
        path: ["url"],
        message:
          data.platform === "x"
            ? "x.com 또는 twitter.com URL이어야 합니다"
            : "facebook.com URL이어야 합니다",
      });
    }
  });

export const linkBulkSchema = z.object({
  folderId: z.string().min(1),
  rows: z.array(linkBulkRowSchema).min(1).max(200),
});

/** 엑셀 셀 값 → platform */
export function normalizeLinkPlatform(raw: unknown): "x" | "facebook" | null {
  const v = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!v) return null;
  if (v === "x" || v === "twitter" || v === "트위터") return "x";
  if (v === "facebook" || v === "fb" || v === "페이스북") return "facebook";
  return null;
}
export const folderInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export const syncIntervalSchema = z.union([
  z.literal(30),
  z.literal(60),
  z.literal(180),
]);

export const memoInputSchema = z.object({
  content: z.string().trim().min(1).max(1000),
  videoUrl: z.string().trim().url().max(500),
  videoTitle: z.string().trim().max(300).optional().nullable(),
  videoId: z.string().trim().max(50).optional().nullable(),
});
