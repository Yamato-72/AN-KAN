import { useState } from "react";
import { ArrowLeft, ExternalLink, Pencil, PackagePlus } from "lucide-react";
import { getStatusColor } from "@/utils/statusColors";
import { formatProjectNumber } from "@/lib/prefixes";
import { EditProjectNumberModal } from "@/components/projects/EditProjectNumberModal";
import { IssueServiceModal } from "@/components/projects/IssueServiceModal";

export function ProjectDetailHeader({ project, onBack }) {
  const [showNumberModal, setShowNumberModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);

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
              {project.drive_folder_link && (
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



