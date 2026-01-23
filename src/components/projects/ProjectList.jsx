import {
  FileText,
  Building,
  Calendar,
  User,
  Flag,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { getStatusColor, getStatusText } from "@/utils/status";
import { useState } from "react";
import { useToggleGfi } from "@/hooks/useToggleGfi";
import { useToggleTrouble } from "@/hooks/useToggleTrouble";
import { toast } from "sonner";

export const ProjectList = ({
  projects,
  isLoading,
  error,
  onDelete,
  showDeleteButton = false,
  showGfiFlag = true,
  isGfiMode = false,
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const toggleGfi = useToggleGfi();
  const toggleTrouble = useToggleTrouble();

  const handleToggleGfi = async (e, project) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const result = await toggleGfi.mutateAsync({
        projectId: project.id,
        gfi: !project.gfi,
      });

      if (result?.message) toast.success(result.message);
    } catch (error) {
      toast.error(error.message || "GFIフラグの更新に失敗しました");
    }
  };

  const handleToggleTrouble = async (e, project) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const result = await toggleTrouble.mutateAsync({
        projectId: project.id,
        trouble_flag: !project.trouble_flag,
      });

      if (result?.message) toast.success(result.message);
    } catch (error) {
      toast.error(error.message || "トラブルフラグの更新に失敗しました");
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;

    try {
      setDeleting(true);
      const response = await fetch(`/api/projects/${selectedProject.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("プロジェクトの削除に失敗しました");

      if (onDelete) onDelete(selectedProject.id);

      setShowDeleteModal(false);
      setSelectedProject(null);
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error(`エラー: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleProjectClick = (projectId) => {
    window.location.href = `/x7k9m3n8q2v5w1z4p6j9r8y3e2u7i5o1a9s8d6f3g7h2j4k8l3m9n6q2w5e8r1t7y4u2i9o6p3/projects/${projectId}${
      isGfiMode ? "?gfi=true" : ""
    }`;
  };

  const formatCurrency = (amount) => {
    if (!amount) return "-";
    return `¥${Number(amount).toLocaleString()}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("ja-JP");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">エラーが発生しました</div>
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">プロジェクトが見つかりません</div>
      </div>
    );
  }

  /**
   * ✅ 並び順を壊さずに重複だけ除外する（Map方式）
   * 親（DashboardPage）でソートした順番を維持したまま、id重複だけ消せる
   */
  const uniqueProjects = Array.from(
    new Map(projects.map((p) => [p.id, p])).values()
  );

  return (
    <>
      <section className="px-4 lg:pl-24 pb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    AD番号
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    プロジェクト名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    クライアント
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    担当者
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    見積額
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    納期
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    問合日
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {uniqueProjects.map((project) => (
                  <tr
                    key={project.id} // ✅ 安定キー
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                      project.trouble_flag ? "bg-yellow-50" : ""
                    }`}
                    onClick={() => handleProjectClick(project.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        {project.ad_number ? `AD-${project.ad_number}` : "-"}
                        {project.trouble_flag && (
                          <AlertTriangle
                            size={14}
                            className="text-orange-500"
                            fill="currentColor"
                          />
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-xs truncate font-medium">
                        {project.project_name || "無題"}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="max-w-xs truncate">
                        {project.client_name || "-"}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-gray-400" />
                        <span className="truncate">
                          {project.assigned_team_member_name || "未設定"}
                          {project.assigned_team_member && (
                            <span className="ml-1 text-gray-400">
                              ({project.assigned_team_member})
                            </span>
                          )}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          project.status
                        )}`}
                      >
                        {getStatusText(project.status)}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatCurrency(project.estimated_amount)}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(project.delivery_date)}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(project.inquiry_date)}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-1">
                        {/* トラブルフラグボタン */}
                        <button
                          onClick={(e) => handleToggleTrouble(e, project)}
                          disabled={toggleTrouble.isPending}
                          className={`p-1 rounded transition-colors ${
                            project.trouble_flag
                              ? "text-orange-600 hover:bg-orange-50"
                              : "text-gray-400 hover:bg-gray-50"
                          } ${
                            toggleTrouble.isPending
                              ? "opacity-50 cursor-wait"
                              : ""
                          }`}
                          title={
                            project.trouble_flag
                              ? "トラブルフラグを解除"
                              : "トラブルフラグを設定"
                          }
                        >
                          <AlertTriangle
                            size={14}
                            fill={project.trouble_flag ? "currentColor" : "none"}
                          />
                        </button>

                        {/* GFIフラグボタン */}
                        {showGfiFlag && (
                          <button
                            onClick={(e) => handleToggleGfi(e, project)}
                            disabled={toggleGfi.isPending}
                            className={`p-1 rounded transition-colors ${
                              project.gfi
                                ? "text-[#005caf] hover:bg-blue-50"
                                : "text-gray-400 hover:bg-gray-50"
                            } ${
                              toggleGfi.isPending
                                ? "opacity-50 cursor-wait"
                                : ""
                            }`}
                            title={
                              project.gfi ? "GFIフラグを解除" : "GFIフラグを設定"
                            }
                          >
                            <Flag
                              size={14}
                              fill={project.gfi ? "currentColor" : "none"}
                            />
                          </button>
                        )}

                        {/* 削除ボタン */}
                        {showDeleteButton && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedProject(project);
                              setShowDeleteModal(true);
                            }}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="プロジェクトを削除"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 削除確認モーダル */}
      {showDeleteButton && showDeleteModal && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                プロジェクトを削除
              </h3>
            </div>

            <div className="px-6 py-4">
              <p className="text-gray-600 mb-4">
                「{selectedProject.project_name}」を削除しますか？
              </p>
              <p className="text-sm text-red-600">
                この操作は元に戻すことができません。
              </p>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedProject(null);
                }}
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
