import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "planner_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30일

function getSecret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s) {
    throw new Error("SESSION_SECRET 환경변수가 필요합니다 (임의의 긴 문자열).");
  }
  return new TextEncoder().encode(s);
}

// 프로젝트 입장 성공 시 서명된 세션 쿠키 발급
export async function setSession(projectId: string): Promise<void> {
  const token = await new SignJWT({ project_id: projectId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

// 현재 세션의 project_id (없거나 무효면 null)
export async function getSessionProjectId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return (payload.project_id as string) ?? null;
  } catch {
    return null;
  }
}

// 특정 프로젝트에 대한 유효 세션 여부
export async function hasSessionFor(projectId: string): Promise<boolean> {
  const current = await getSessionProjectId();
  return current === projectId;
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
