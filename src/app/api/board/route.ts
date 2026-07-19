import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db";
import { requireProjectId, isValidDate } from "@/lib/apiSession";

export const runtime = "nodejs";

// 폴링용 통합 조회: 세션 프로젝트의 멤버 + 해당 날짜 이벤트.
export async function GET(req: Request) {
  const { projectId, res } = await requireProjectId();
  if (res) return res;

  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  if (!isValidDate(date)) {
    return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  }

  const supabase = getServiceClient();

  const [membersR, eventsR] = await Promise.all([
    supabase
      .from("members")
      .select("id, project_id, name, color, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
    supabase
      .from("events")
      .select(
        "id, project_id, member_id, date, start_hour, end_hour, title, source_lang, translations, created_at, updated_at",
      )
      .eq("project_id", projectId)
      .eq("date", date)
      .order("start_hour", { ascending: true }),
  ]);

  if (membersR.error || eventsR.error) {
    console.error("board fetch failed", membersR.error, eventsR.error);
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  return NextResponse.json({ members: membersR.data, events: eventsR.data });
}
