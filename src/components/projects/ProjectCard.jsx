import {
  FileText,
  Building,
  Calendar,
  MapPin,
  Clock,
  Trash2,
  Flag,
  AlertTriangle,
  User,
} from "lucide-react";
import { StatusProgressBar } from "@/components/StatusProgressBar";
import { getStatusColor, getStatusIcon, getStatusText } from "@/utils/status";
import { useState } from "react";
import { useToggleGfi } from "@/hooks/useToggleGfi";
import { useToggleTrouble } from "@/hooks/useToggleTrouble";
import { toast } from "sonner";

export const ProjectCard = ({
  project,
  onDelete,
  showDeleteButton = false,
  showGfiFlag = true, // 新しいプロパティを追加
  isGfiMode = false, // GFIモードかどうかを示すプロパティを追加
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const toggleGfi = useToggleGfi();
  const toggleTrouble = useToggleTrouble();

  const handleToggleGfi = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const result = await toggleGfi.mutateAsync({
        projectId: project.id,
        gfi: !project.gfi,
      });

      if (result?.message) {
        toast.success(result.message);
      }
    } catch (error) {
      toast.error(error.message || "GFIフラグの更新に失敗しました");
    }
  };

  const handleToggleTrouble = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const result = await toggleTrouble.mutateAsync({
        projectId: project.id,
        trouble_flag: !project.trouble_flag,
      });

      if (result?.message) {
        toast.success(result.message);
      }
    } catch (error) {
      toast.error(error.message || "トラブルフラグの更新に失敗しました");
    }
  };

  const handleDeleteProject = async () => {
    try {
      setDeleting(true);
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("プロジェクトの削除に失敗しました");
      }

      if (onDelete) {
        onDelete(project.id);
      }
      setShowDeleteModal(false);
    } catch (error) {
      console.error("Error deleting project:", error);
      alert(`エラー: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div
        className={`border border-gray-200 rounded-lg p-4 lg:p-6 hover:shadow-md transition-shadow hover:border-blue-300 relative ${
          project.trouble_flag ? "bg-yellow-50 border-yellow-300" : "bg-white"
        }`}
      >
        {/* 右上のボタンエリア */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {/* トラブルフラグボタン */}
          <button
            onClick={handleToggleTrouble}
            disabled={toggleTrouble.isPending}
            className={`p-1.5 rounded-lg transition-colors ${
              project.trouble_flag
                ? "text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
            } ${toggleTrouble.isPending ? "opacity-50 cursor-wait" : ""}`}
            title={
              project.trouble_flag
                ? "トラブルフラグを解除"
                : "トラブルフラグを設定"
            }
          >
            {toggleTrouble.isPending ? (
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <AlertTriangle
                size={16}
                fill={project.trouble_flag ? "currentColor" : "none"}
              />
            )}
          </button>

          {/* GFIフラグボタン - showGfiFlagがtrueの時のみ表示 */}
          {showGfiFlag && (
            <button
              onClick={handleToggleGfi}
              disabled={toggleGfi.isPending}
              className={`p-1.5 rounded-lg transition-colors ${
                project.gfi
                  ? "text-[#005caf] hover:text-[#004a9a] hover:bg-blue-50"
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
              } ${toggleGfi.isPending ? "opacity-50 cursor-wait" : ""}`}
              title={project.gfi ? "GFIフラグを解除" : "GFIフラグを設定"}
            >
              {toggleGfi.isPending ? (
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Flag size={16} fill={project.gfi ? "currentColor" : "none"} />
              )}
            </button>
          )}

          {/* 削除ボタン - showDeleteButtonがtrueの時のみ表示 */}
          {showDeleteButton && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="プロジェクトを削除"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>

        {/* クリック可能な上部エリア（納期の行まで） */}
        <a
          href={`/x7k9m3n8q2v5w1z4p6j9r8y3e2u7i5o1a9s8d6f3g7h2j4k8l3m9n6q2w5e8r1t7y4u2i9o6p3/projects/${project.id}${isGfiMode ? "?gfi=true" : ""}`}
          className="block cursor-pointer pr-16"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-base lg:text-lg font-semibold text-gray-700 mb-2 leading-snug hover:text-blue-600 transition-colors">
                {project.client_name}
              </h3>
              <div
                className={`inline-flex items-center gap-1 px-2 lg:px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}
              >
                {getStatusIcon(project.status)}
                {getStatusText(project.status)}
              </div>
            </div>
          </div>

          <div className="space-y-2 lg:space-y-3 mb-6">
            {project.ad_number && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="font-medium">AD-{project.ad_number}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Building className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="truncate">{project.project_name}</span>
            </div>
            {/* 担当者情報を追加 */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="truncate">
                {project.assigned_team_member_name || "未設定"}
                {project.assigned_team_member && (
                  <span className="ml-1 text-gray-500">
                    ({project.assigned_team_member})
                  </span>
                )}
              </span>
            </div>
            {project.delivery_date && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span>
                  納期:{" "}
                  {new Date(project.delivery_date).toLocaleDateString("ja-JP")}
                </span>
              </div>
            )}
            {project.location && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="truncate">{project.location}</span>
              </div>
            )}
          </div>
        </a>

        {/* ステータスバー部分（クリック対象外） */}
        <div className="mb-4">
          <StatusProgressBar
            currentStatus={project.status}
            projectId={project.id}
            project={project}
          />
        </div>

        {/* 登録日・更新日部分（クリック対象外） */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span className="hidden sm:inline">
              登録:{" "}
              {project.created_at
                ? new Date(project.created_at).toLocaleDateString("ja-JP")
                : "未設定"}
            </span>
            <span className="sm:hidden">
              登録:{" "}
              {project.created_at
                ? new Date(project.created_at).toLocaleDateString("ja-JP", {
                    month: "short",
                    day: "numeric",
                  })
                : "未設定"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span className="hidden sm:inline">
              更新:{" "}
              {project.updated_at
                ? new Date(project.updated_at).toLocaleDateString("ja-JP")
                : "未設定"}
            </span>
            <span className="sm:hidden">
              更新:{" "}
              {project.updated_at
                ? new Date(project.updated_at).toLocaleDateString("ja-JP", {
                    month: "short",
                    day: "numeric",
                  })
                : "未設定"}
            </span>
          </div>
        </div>
      </div>

      {/* 削除確認モーダル - showDeleteButtonがtrueの時のみ表示 */}
      {showDeleteButton && showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                プロジェクトを削除
              </h3>
            </div>

            <div className="px-6 py-4">
              <p className="text-gray-600 mb-4">
                「{project.project_name}」を削除しますか？
              </p>
              <p className="text-sm text-red-600">
                この操作は元に戻すことができません。
              </p>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={deleting}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleting && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
                削除
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};



