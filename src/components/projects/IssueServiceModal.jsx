import { useState, useEffect } from "react";
import { X } from "lucide-react";

// ============================================================
// TS案件を在庫ナビ（サービス発券）へ送るモーダル
//   - 内容（修理/現調/保守など）を選んでから発券
//   - 発券すると在庫シートに種別「サービス」・0円・出庫済の行が1本立つ
//   - 二重発券はサーバ側で弾かれ、409で「発券済み」と表示される
// ============================================================

export const IssueServiceModal = ({ show, onClose, project, onSuccess }) => {
  const [content, setContent] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (show) {
      setContent("");
      setNote("");
      setError("");
    }
  }, [show]);

  if (!show) return null;

  const label = `${project?.prefix || "TS"}-${project?.ad_number ?? ""}`;

  const handleIssue = async () => {
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/issue-service`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, note }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "発券に失敗しました");
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
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold text-gray-800">在庫ナビへ発券</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          {label} を在庫ナビにサービス案件（0円・出庫済）として登録します。物理在庫・棚卸しには計上されません。
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            内容
          </label>
          <div className="flex gap-1.5 mb-2">
            {["修理", "現調", "保守"].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setContent(v)}
                className={`px-3 py-1 text-sm rounded-lg ${
                  content === v
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="修理 / 現調 / 保守 など（空なら案件名を使用）"
          />
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            備考
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="任意"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
          >
            キャンセル
          </button>
          <button
            onClick={handleIssue}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50"
          >
            {saving ? "発券中..." : "発券する"}
          </button>
        </div>
      </div>
    </div>
  );
};
