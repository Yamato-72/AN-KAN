import { Grid3X3, List } from "lucide-react";

export const ViewToggle = ({ viewMode, onViewModeChange }) => {
  return (
    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
      <button
        onClick={() => onViewModeChange("grid")}
        className={`p-2 rounded-md transition-colors ${
          viewMode === "grid"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-600 hover:text-gray-900"
        }`}
        title="カード表示"
      >
        <Grid3X3 size={16} />
      </button>
      <button
        onClick={() => onViewModeChange("list")}
        className={`p-2 rounded-md transition-colors ${
          viewMode === "list"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-600 hover:text-gray-900"
        }`}
        title="リスト表示"
      >
        <List size={16} />
      </button>
    </div>
  );
};



