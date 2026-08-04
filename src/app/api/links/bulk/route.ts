import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { linkBulkRowSchema } from "@/lib/validators";
import { z } from "zod";

const requestSchema = z.object({
  folderId: z.string().min(1),
  rows: z
    .array(
      z.object({
        platform: z.string(),
        name: z.string(),
        url: z.string(),
      }),
    )
    .min(1)
    .max(200),
});

/** X/Facebook 링크 일괄 등록 */
export async function POST(req: Request) {
  const authz = await requireUser();
  if ("error" in authz) return authz.error;

  const body = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const folder = await prisma.folder.findFirst({
    where: { id: parsed.data.folderId, userId: authz.userId },
    select: { id: true },
  });
  if (!folder) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  let created = 0;
  const failures: Array<{ row: number; name: string; reason: string }> = [];

  for (let i = 0; i < parsed.data.rows.length; i++) {
    const raw = parsed.data.rows[i];
    const excelRow = i + 2;
    const rowParsed = linkBulkRowSchema.safeParse(raw);
    if (!rowParsed.success) {
      const reason =
        rowParsed.error.issues[0]?.message ?? "행 형식이 올바르지 않습니다";
      failures.push({
        row: excelRow,
        name: String(raw.name || ""),
        reason,
      });
      continue;
    }

    try {
      await prisma.link.create({
        data: {
          userId: authz.userId,
          platform: rowParsed.data.platform,
          name: rowParsed.data.name,
          url: rowParsed.data.url,
          folders: {
            create: [{ folderId: folder.id, order: i }],
          },
        },
      });
      created += 1;
    } catch (err) {
      failures.push({
        row: excelRow,
        name: rowParsed.data.name,
        reason: err instanceof Error ? err.message : "저장 실패",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    created,
    failed: failures.length,
    failures,
  });
}
