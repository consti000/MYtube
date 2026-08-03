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
