import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServiceClient } from "@/lib/db";
import { setSession } from "@/lib/session";

export const runtime = "nodejs";

// 프로젝트 입장: 비밀번호 대조 성공 시 세션 쿠키 발급.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const password = String(body.password ?? "");

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, password_hash")
    .eq("id", id)
    .single();

  if (error || !data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const ok = await bcrypt.compare(password, data.password_hash);
  if (!ok) return NextResponse.json({ error: "wrong_password" }, { status: 401 });

  await setSession(id);
  return NextResponse.json({ ok: true });
}
