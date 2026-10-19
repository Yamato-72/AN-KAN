import { useState } from "react";
import { ArrowLeft, ExternalLink, Pencil, PackagePlus } from "lucide-react";
import { getStatusColor } from "@/utils/statusColors";
import { formatProjectNumber } from "@/lib/prefixes";
import { EditProjectNumberModal } from "@/components/projects/EditProjectNumberModal";
import { IssueServiceModal } from "@/components/projects/IssueServiceModal";

export function ProjectDetailHeader({ project, onBack, onUpdated }) {
  const [showNumberModal, setShowNumberModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  // Driveリンクの手動設定（過去案件の既存フォルダ紐付け用）
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [driveUrl, setDriveUrl] = useState("");
  const [driveSaving, setDriveSaving] = useState(false);
  const [driveError, setDriveError] = useState("");

  const openDriveModal = () => {
    setDriveUrl(project.drive_folder_link || "");
    setDriveError("");
    setShowDriveModal(true);
  };

  const saveDriveLink = async (clear = false) => {
    setDriveSaving(true);
    setDriveError("");
    try {
      const res = await fetch(`/api/projects/${project.id}/drive-link`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drive_folder_link: clear ? "" : driveUrl }),
      });
      const d = await res.json();
      if (!res.ok) {
        setDriveError(d.error || "更新に失敗しました");
        return;
      }
      setShowDriveModal(false);
      if (onUpdated) onUpdated();
      else window.location.reload();
    } finally {
      setDriveSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow mb-6">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>戻る</span>
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900 truncate">
                {project.project_name || `プロジェクト ${project.id}`}
              </h1>
              {/* Google Drive Link */}
              {project.drive_folder_link ? (
                <span className="inline-flex items-center gap-1">
                  <a
                    href={project.drive_folder_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 border border-blue-200 rounded-lg text-sm font-medium transition-colors"
                    title="Google Driveフォルダを開く"
                  >
                    <ExternalLink size={14} />
                    Drive
                  </a>
                  <button
                    onClick={openDriveModal}
                    className="p-1 text-gray-300 hover:text-blue-600"
                    title="Driveリンクを変更・解除"
                  >
                    <Pencil size={12} />
                  </button>
                </span>
              ) : (
                <button
                  onClick={openDriveModal}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-dashed border-gray-300 text-gray-400 hover:text-blue-600 hover:border-blue-300 rounded-lg text-xs transition-colors"
                  title="既存のDriveフォルダのURLを紐付ける（フォルダは作成されません）"
                >
                  + Drive
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-600">
                {formatProjectNumber(project.prefix, project.ad_number || project.id)}
              </p>
              <button
                onClick={() => setShowNumberModal(true)}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-gray-500 hover:text-blue-700 hover:bg-blue-50 border border-gray-200 rounded transition-colors"
                title="案件番号を変更（AD→TSなど）"
              >
                <Pencil size={12} />
                変更
              </button>
              {(project.prefix || "AD") === "TS" && (
                <button
                  onClick={() => setShowIssueModal(true)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-emerald-700 hover:text-white hover:bg-emerald-600 border border-emerald-200 rounded transition-colors"
                  title="在庫ナビへサービス発券"
                >
                  <PackagePlus size={12} />
                  在庫ナビへ発券
                </button>
              )}
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(project.status)}`}
          >
            {project.status}
          </span>
        </div>
      </div>

      {/* Driveリンク設定モーダル */}
      {showDriveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-base font-semibold text-gray-800 mb-1">
              Driveフォルダリンクの設定
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              既存フォルダのURLを貼ってください（フォルダを開いてアドレスバーをコピー）。
              フォルダの新規作成はされません。
            </p>
            <input
              type="url"
              value={driveUrl}
              onChange={(e) => setDriveUrl(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {driveError && (
              <p className="text-sm text-red-600 mt-2">{driveError}</p>
            )}
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowDriveModal(false)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                キャンセル
              </button>
              {project.drive_folder_link && (
                <button
                  onClick={() => saveDriveLink(true)}
                  disabled={driveSaving}
                  className="px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 disabled:opacity-50"
                >
                  リンクを外す
                </button>
              )}
              <button
                onClick={() => saveDriveLink(false)}
                disabled={driveSaving || !driveUrl.trim()}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {driveSaving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}

      <EditProjectNumberModal
        show={showNumberModal}
        onClose={() => setShowNumberModal(false)}
        project={project}
        onSuccess={() => {
          // 番号変更は稀な操作なので、確実に反映させるため画面を再読込
          window.location.reload();
        }}
      />

      <IssueServiceModal
        show={showIssueModal}
        onClose={() => setShowIssueModal(false)}
        project={project}
        onSuccess={() => {
          // 発券結果を活動ログに反映させるため再読込
          window.location.reload();
        }}
      />
    </div>
  );
}



