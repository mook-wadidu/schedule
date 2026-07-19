import { NextResponse } from "next/server";
import { getSessionProjectId } from "@/lib/session";

// 라우트 핸들러용: 세션의 project_id를 반환하거나, 없으면 401 응답을 반환.
export async function requireProjectId(): Promise<
  { projectId: string; res?: undefined } | { projectId?: undefined; res: NextResponse }
> {
  const projectId = await getSessionProjectId();
  if (!projectId) {
    return { res: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  return { projectId };
}

// YYYY-MM-DD 형식 검증
export function isValidDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}
