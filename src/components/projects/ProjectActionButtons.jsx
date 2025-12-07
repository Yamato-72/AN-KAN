import { Edit, UserPlus } from "lucide-react";

export function ProjectActionButtons({ canPass, onEdit, onPass }) {
  return (
    <div className="mt-6 bg-white rounded-lg shadow">
      <div className="px-6 py-4">
        <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3 sm:justify-end">
          {/* 編集ボタン */}
          <button
            onClick={onEdit}
            className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium flex items-center justify-center space-x-2 transition-colors"
          >
            <Edit size={16} />
            <span>編集</span>
          </button>

          {canPass && (
            <button
              onClick={onPass}
              className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg text-sm font-medium flex items-center justify-center space-x-2 transition-colors"
            >
              <UserPlus size={16} />
              <span>Pass</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}



