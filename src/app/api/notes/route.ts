import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db";
import { requireProjectId, isValidDate } from "@/lib/apiSession";
import { translateTitle } from "@/lib/translate";
import { LOCALES, Locale } from "@/lib/types";

export const runtime = "nodejs";

// "오늘의 한 마디" 저장(upsert). 빈 메시지면 삭제.
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
  const message = String(body.message ?? "").trim();
  const sourceLang = (LOCALES.includes(body.source_lang as Locale)
    ? body.source_lang
    : "ko") as Locale;

  if (!memberId) return NextResponse.json({ error: "member_required" }, { status: 400 });
  if (!isValidDate(date)) return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  if (message.length > 200) return NextResponse.json({ error: "too_long" }, { status: 400 });

  const supabase = getServiceClient();

  // 멤버가 이 프로젝트 소속인지 확인
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("id", memberId)
    .eq("project_id", projectId)
    .single();
  if (!member) return NextResponse.json({ error: "member_not_found" }, { status: 400 });

  // 빈 메시지 = 삭제
  if (!message) {
    await supabase.from("notes").delete().eq("member_id", memberId).eq("date", date);
    return NextResponse.json({ note: null });
  }

  const translations = await translateTitle(message, sourceLang);

  const { data, error } = await supabase
    .from("notes")
    .upsert(
      {
        project_id: projectId,
        member_id: memberId,
        date,
        message,
        source_lang: sourceLang,
        translations,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "member_id,date" },
    )
    .select("id, project_id, member_id, date, message, source_lang, translations, created_at, updated_at")
    .single();

  if (error) {
    console.error("upsert note failed", error);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  return NextResponse.json({ note: data });
}
