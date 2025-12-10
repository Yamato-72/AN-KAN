import { Edit, UserPlus, XCircle, PauseCircle } from "lucide-react";

export function ProjectActionButtons({
  canPass,
  onEdit,
  onPass,
  onLost,   // 失注ボタン用
  onHold,   // 保留ボタン用
  isLost = false,  // 失注中かどうか
  isHold = false,  // 保留中かどうか
}) {
  return (
    <div className="mt-6 bg-white rounded-lg shadow">
      <div className="px-6 py-4">
        <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3 sm:justify-end flex-wrap gap-2">
          {/* 編集ボタン */}
          <button
            onClick={onEdit}
            className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium flex items-center justify-center space-x-2 transition-colors"
          >
            <Edit size={16} />
            <span>編集</span>
          </button>

          {/* Passボタン */}
          {canPass && (
            <button
              onClick={onPass}
              className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg text-sm font-medium flex items-center justify-center space-x-2 transition-colors"
            >
              <UserPlus size={16} />
              <span>Pass</span>
            </button>
          )}

          {/* 保留ボタン */}
          {onHold && (
            <button
              onClick={onHold}
              className={`w-full sm:w-auto px-6 py-2 rounded-lg text-sm font-medium flex items-center justify-center space-x-2 transition-colors
                ${
                  isHold
                    ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                    : "bg-yellow-400 hover:bg-yellow-500 text-gray-900"
                }`}
            >
              <PauseCircle size={16} />
              <span>{isHold ? "保留を解除" : "保留にする"}</span>
            </button>
          )}

          {/* 失注ボタン */}
          {onLost && (
            <button
              onClick={onLost}
              className={`w-full sm:w-auto px-6 py-2 rounded-lg text-sm font-medium flex items-center justify-center space-x-2 transition-colors
                ${
                  isLost
                    ? "bg-red-700 hover:bg-red-800 text-white"
                    : "bg-red-500 hover:bg-red-600 text-white"
                }`}
            >
              <XCircle size={16} />
              <span>{isLost ? "失注を解除" : "失注にする"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
