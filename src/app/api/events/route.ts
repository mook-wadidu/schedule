import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db";
import { requireProjectId, isValidDate } from "@/lib/apiSession";
import { translateTitle } from "@/lib/translate";
import { LOCALES, Locale } from "@/lib/types";

export const runtime = "nodejs";

function parseHour(v: unknown): number | null {
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
}

// 이벤트 생성: 멤버/날짜/시작~종료/제목. 저장 시 3개 언어 번역본 캐싱.
export async function POST(req: Request) {
  const { projectId, res } = await requireProjectId();
  if (res) return res;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const memberId = String(body.member_id ?? "");
  const date = body.date;
  const startHour = parseHour(body.start_hour);
  const endHour = parseHour(body.end_hour);
  const title = String(body.title ?? "").trim();
  const sourceLang = (LOCALES.includes(body.source_lang as Locale)
    ? body.source_lang
    : "ko") as Locale;

  if (!memberId) return NextResponse.json({ error: "member_required" }, { status: 400 });
  if (!isValidDate(date)) return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  if (!title) return NextResponse.json({ error: "title_required" }, { status: 400 });
  if (startHour === null || endHour === null || !(startHour >= 0 && startHour < endHour && endHour <= 24)) {
    return NextResponse.json({ error: "invalid_hours" }, { status: 400 });
  }

  const supabase = getServiceClient();

  // 멤버가 이 프로젝트 소속인지 확인
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("id", memberId)
    .eq("project_id", projectId)
    .single();
  if (!member) return NextResponse.json({ error: "member_not_found" }, { status: 400 });

  const translations = await translateTitle(title, sourceLang);

  const { data, error } = await supabase
    .from("events")
    .insert({
      project_id: projectId,
      member_id: memberId,
      date,
      start_hour: startHour,
      end_hour: endHour,
      title,
      source_lang: sourceLang,
      translations,
    })
    .select(
      "id, project_id, member_id, date, start_hour, end_hour, title, source_lang, translations, created_at, updated_at",
    )
    .single();

  if (error) {
    console.error("create event failed", error);
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }

  return NextResponse.json({ event: data });
}
