"use client";

import { useState } from "react";
import {
  Edit,
  UserPlus,
  XCircle,
  PauseCircle,
  Settings,
  ChevronDown,
} from "lucide-react";

export function ProjectActionButtons({
  canPass,
  onEdit,
  onPass,
  onLost, // 失注ボタン用
  onHold, // 保留ボタン用
  isLost = false, // 失注中かどうか
  isHold = false, // 保留中かどうか
}) {
  // 折りたたみの開閉状態。初期は閉じておく
  const [open, setOpen] = useState(false);

  // ボタンを押したら、その操作をしてから閉じる
  const run = (fn) => () => {
    setOpen(false);
    if (fn) fn();
  };

  return (
    <div className="mt-6 bg-white rounded-lg shadow">
      <div className="px-6 py-4">
        <div className="flex justify-end">
          {/* 「操作」トグルボタン */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            aria-expanded={open}
          >
            <Settings size={16} />
            <span>操作</span>
            <ChevronDown
              size={16}
              className={`transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {/* 開いたときだけ、4つのボタンを表示 */}
        {open && (
          <div className="mt-3 flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3 sm:justify-end flex-wrap gap-2">
            {/* 編集ボタン */}
            <button
              onClick={run(onEdit)}
              className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium flex items-center justify-center space-x-2 transition-colors"
            >
              <Edit size={16} />
              <span>編集</span>
            </button>

            {/* Passボタン */}
            {canPass && (
              <button
                onClick={run(onPass)}
                className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg text-sm font-medium flex items-center justify-center space-x-2 transition-colors"
              >
                <UserPlus size={16} />
                <span>Pass</span>
              </button>
            )}

            {/* 保留ボタン */}
            {onHold && (
              <button
                onClick={run(onHold)}
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
                onClick={run(onLost)}
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
        )}
      </div>
    </div>
  );
}
