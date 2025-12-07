import { Search } from "lucide-react";

export const MobileSearch = ({
  show,
  onClose,
  searchQuery,
  onSearchQueryChange,
  searchPlaceholder = "プロジェクトを検索...", // デフォルトのプレースホルダー
}) => {
  if (!show) return null;
  return (
    <div className="lg:hidden bg-white border-b border-gray-200 p-4 sticky top-16 z-20">
      <div className="relative">
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-0 focus:border-gray-300 focus:outline-none"
        />
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
      </div>
    </div>
  );
};



