import Link from "next/link";
import { getServiceClient } from "@/lib/db";
import { hasSessionFor } from "@/lib/session";
import { Project } from "@/lib/types";
import JoinPrompt from "./JoinPrompt";
import ProjectClient from "./ProjectClient";

// 쿠키/DB에 의존하므로 항상 요청 시 렌더 (빌드 시 프리렌더 안 함)
export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = getServiceClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, visible_start_hour, visible_end_hour, created_at")
    .eq("id", id)
    .single();

  if (!project) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
        <p className="text-lg font-medium">프로젝트를 찾을 수 없습니다.</p>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← 홈으로
        </Link>
      </main>
    );
  }

  const authorized = await hasSessionFor(id);
  if (!authorized) {
    return <JoinPrompt projectId={id} projectName={project.name} />;
  }

  return <ProjectClient project={project as Project} />;
}
