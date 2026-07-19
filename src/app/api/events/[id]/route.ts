import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db";
import { requireProjectId } from "@/lib/apiSession";
import { translateTitle } from "@/lib/translate";
import { LOCALES, Locale } from "@/lib/types";

export const runtime = "nodejs";

function parseHour(v: unknown): number | null {
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
}

// 이벤트 수정: 제목이 바뀌면 재번역. 시간만 바뀌면 기존 번역 유지.
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { projectId, res } = await requireProjectId();
  if (res) return res;
  const { id } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const supabase = getServiceClient();

  // 대상 이벤트가 이 프로젝트 소속인지 확인
  const { data: existing } = await supabase
    .from("events")
    .select("id, title, source_lang")
    .eq("id", id)
    .eq("project_id", projectId)
    .single();
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.start_hour !== undefined || body.end_hour !== undefined) {
    const startHour = parseHour(body.start_hour);
    const endHour = parseHour(body.end_hour);
    if (startHour === null || endHour === null || !(startHour >= 0 && startHour < endHour && endHour <= 24)) {
      return NextResponse.json({ error: "invalid_hours" }, { status: 400 });
    }
    update.start_hour = startHour;
    update.end_hour = endHour;
  }

  if (body.title !== undefined) {
    const title = String(body.title).trim();
    if (!title) return NextResponse.json({ error: "title_required" }, { status: 400 });
    const sourceLang = (LOCALES.includes(body.source_lang as Locale)
      ? body.source_lang
      : existing.source_lang) as Locale;
    update.title = title;
    update.source_lang = sourceLang;
    update.translations = await translateTitle(title, sourceLang);
  }

  const { data, error } = await supabase
    .from("events")
    .update(update)
    .eq("id", id)
    .eq("project_id", projectId)
    .select(
      "id, project_id, member_id, date, start_hour, end_hour, title, source_lang, translations, created_at, updated_at",
    )
    .single();

  if (error) {
    console.error("update event failed", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ event: data });
}

// 이벤트 삭제
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { projectId, res } = await requireProjectId();
  if (res) return res;
  const { id } = await ctx.params;

  const supabase = getServiceClient();
  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", id)
    .eq("project_id", projectId);

  if (error) {
    console.error("delete event failed", error);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
