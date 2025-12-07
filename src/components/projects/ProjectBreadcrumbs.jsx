import { ChevronRight } from "lucide-react";
import { createSecretUrl } from "@/utils/secretPath";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export function ProjectBreadcrumbs({ projectName }) {
  const { currentUser } = useCurrentUser();

  return (
    <nav className="px-4 lg:pl-24 pt-4 lg:pt-6 text-xs text-gray-400 space-x-2">
      <a
        href={createSecretUrl(
          currentUser?.code ? `/dashboard/${currentUser.code}` : "/all-project",
        )}
        className="hover:text-gray-600 transition-colors cursor-pointer"
      >
        {currentUser?.code ? "ダッシュボード" : "プロジェクト一覧"}
      </a>
      <ChevronRight className="inline h-3 w-3" />
      <a
        href={createSecretUrl("/all-project")}
        className="hover:text-gray-600 transition-colors cursor-pointer"
      >
        プロジェクト一覧
      </a>
      <ChevronRight className="inline h-3 w-3" />
      <span className="text-gray-500">{projectName}</span>
    </nav>
  );
}



