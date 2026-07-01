import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { PROJECT_PREFIXES } from "@/lib/prefixes";

// ============================================================
// 案件番号（接頭辞 + 番号）だけを変更する専用モーダル
//   - 今日作った重複チェック付きAPI（PUT /api/projects/[id]/ad-number）を呼ぶ
//   - AD→TS のような接頭辞の付け替えもここで行う
//   - 同じ「接頭辞 + 番号」が他案件にあると、APIが409で弾いてくれる
// ============================================================

export const EditProjectNumberModal = ({ show, onClose, project, onSuccess }) => {
  const [prefix, setPrefix] = useState("AD");
  const [adNumber, setAdNumber] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // モーダルを開くたびに、今の案件の値で初期化
  useEffect(() => {
    if (show && project) {
      setPrefix(project.prefix || "AD");
      setAdNumber(project.ad_number ? String(project.ad_number) : "");
      setError("");
    }
  }, [show, project]);

  if (!show) return null;

  const currentLabel = `${project?.prefix || "AD"}-${project?.ad_number ?? ""}`;
  const nextLabel = `${prefix}-${adNumber || ""}`;

  const handleSave = async () => {
    setError("");

    // 番号は正の整数のみ
    const n = parseInt(adNumber, 10);
    if (Number.isNaN(n) || n <= 0) {
      setError("番号は正の整数で入力してください");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/ad-number`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefix, ad_number: n }),
      });

      const data = await res.json();

      if (!res.ok) {
        // 409（重複）など、APIが返したメッセージをそのまま見せる
        throw new Error(data.error || "番号の変更に失敗しました");
      }

      if (onSuccess) onSuccess(data);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">案件番号の変更</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            接頭辞と番号
          </label>
          <div className="flex gap-2">
            <select
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {PROJECT_PREFIXES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={adNumber}
              onChange={(e) => setAdNumber(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="例: 5"
              min="1"
            />
          </div>
        </div>

        {/* 変更前後のプレビュー */}
        <div className="mb-5 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
          <span className="font-medium">{currentLabel}</span>
          <span className="mx-2">→</span>
          <span className="font-medium text-blue-700">{nextLabel}</span>
          <p className="text-xs text-gray-400 mt-1">
            他の案件と同じ番号にはできません（重複時は変更が止まります）
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
          >
            {saving ? "変更中..." : "変更する"}
          </button>
        </div>
      </div>
    </div>
  );
};
