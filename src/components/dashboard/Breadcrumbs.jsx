import { ChevronRight } from "lucide-react";

export const Breadcrumbs = () => {
  return (
    <nav className="px-4 lg:pl-24 pt-4 lg:pt-6 text-xs text-gray-400 space-x-2">
      <span>ダッシュボード</span>
      <ChevronRight className="inline h-3 w-3" />
      <span className="text-gray-500">プロジェクト管理</span>
    </nav>
  );
};



