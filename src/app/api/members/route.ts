import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db";
import { requireProjectId } from "@/lib/apiSession";
import { MEMBER_COLORS } from "@/lib/types";

export const runtime = "nodejs";

// 멤버 추가: 이름만 받고 색은 순서대로 자동 배정.
export async function POST(req: Request) {
  const { projectId, res } = await requireProjectId();
  if (res) return res;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name_required" }, { status: 400 });
  if (name.length > 40) return NextResponse.json({ error: "name_too_long" }, { status: 400 });

  const supabase = getServiceClient();

  // 색 배정: 기존 멤버 수 기준으로 팔레트 순환
  const { count } = await supabase
    .from("members")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  const color = MEMBER_COLORS[(count ?? 0) % MEMBER_COLORS.length];

  const { data, error } = await supabase
    .from("members")
    .insert({ project_id: projectId, name, color })
    .select("id, project_id, name, color, created_at")
    .single();

  if (error) {
    // 유니크 위반 = 이미 있는 이름
    if (error.code === "23505") {
      return NextResponse.json({ error: "name_exists" }, { status: 409 });
    }
    console.error("add member failed", error);
    return NextResponse.json({ error: "add_failed" }, { status: 500 });
  }

  return NextResponse.json({ member: data });
}
