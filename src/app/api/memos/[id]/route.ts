import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { memoUpdateSchema } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const authz = await requireUser();
  if ("error" in authz) return authz.error;
  const { id } = await ctx.params;

  const parsed = memoUpdateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.memo.findFirst({
    where: { id, userId: authz.userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const memo = await prisma.memo.update({
    where: { id },
    data: { content: parsed.data.content },
  });
  return NextResponse.json(memo);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const authz = await requireUser();
  if ("error" in authz) return authz.error;
  const { id } = await ctx.params;

  const memo = await prisma.memo.findFirst({
    where: { id, userId: authz.userId },
  });
  if (!memo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.memo.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
