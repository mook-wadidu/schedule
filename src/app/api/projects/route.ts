import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServiceClient } from "@/lib/db";
import { setSession } from "@/lib/session";

export const runtime = "nodejs";

// 공개 프로젝트 목록: 누구나 조회 가능(이름·인원수만 노출, 비밀번호 해시는 제외).
// 실제 입장은 비밀번호로 보호됨.
export async function GET() {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, created_at, members(count)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("list projects failed", error);
    return NextResponse.json({ error: "list_failed" }, { status: 500 });
  }

  const projects = (data ?? []).map((p) => {
    const members = (p as { members?: { count: number }[] }).members;
    return {
      id: p.id,
      name: p.name,
      created_at: p.created_at,
      member_count: Array.isArray(members) ? (members[0]?.count ?? 0) : 0,
    };
  });

  return NextResponse.json({ projects });
}

// 프로젝트 생성: 이름 + 비밀번호. 생성자에게 바로 세션 쿠키 발급.
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const password = String(body.password ?? "");
  const startHour = Number.isInteger(body.visible_start_hour) ? (body.visible_start_hour as number) : 8;
  const endHour = Number.isInteger(body.visible_end_hour) ? (body.visible_end_hour as number) : 22;

  if (!name) return NextResponse.json({ error: "name_required" }, { status: 400 });
  if (password.length < 4) return NextResponse.json({ error: "password_too_short" }, { status: 400 });
  if (!(startHour >= 0 && startHour < endHour && endHour <= 24)) {
    return NextResponse.json({ error: "invalid_hours" }, { status: 400 });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      name,
      password_hash,
      visible_start_hour: startHour,
      visible_end_hour: endHour,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("create project failed", error);
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }

  await setSession(data.id);
  return NextResponse.json({ id: data.id });
}
