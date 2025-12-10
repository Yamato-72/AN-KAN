"use client";

import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { NewProjectModal } from "@/components/projects/NewProjectModal";
import { ProjectLogs } from "@/components/projects/ProjectLogs";
import { ProjectPayments } from "@/components/projects/ProjectPayments";
import { ProjectBreadcrumbs } from "@/components/projects/ProjectBreadcrumbs";
import { ProjectDetailHeader } from "@/components/projects/ProjectDetailHeader";
import { ProjectBasicInfo } from "@/components/projects/ProjectBasicInfo";
import { ProjectClientInfo } from "@/components/projects/ProjectClientInfo";
import { ProjectActivities } from "@/components/projects/ProjectActivities";
import { PassProjectModal } from "@/components/projects/PassProjectModal";
import { ProjectActionButtons } from "@/components/projects/ProjectActionButtons";
import { StatusProgressBar } from "@/components/StatusProgressBar";
import { useProjectDetail } from "@/hooks/useProjectDetail";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { usePassProject } from "@/hooks/usePassProject";

export default function ProjectDetailPage({ params }) {
  const { project, loading, error, refetch } = useProjectDetail(params.id);
  const { staffMembers } = useStaffMembers();
  const { passProject, passingProject } = usePassProject(params.id);

  const [showPassModal, setShowPassModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isGfiMode, setIsGfiMode] = useState(false);
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [activeTab, setActiveTab] = useState("overview"); // タブ状態を追加

  // GFIモードとデバッグモードの判定
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setIsGfiMode(urlParams.get("gfi") === "true");
    setIsDebugMode(urlParams.get("debug") === "true");
  }, []);

  const handlePassProject = async (newAssignedId) => {
    try {
      await passProject(newAssignedId);
      alert("担当者を変更しました");
      setShowPassModal(false);
      refetch();
    } catch (err) {
      alert(`エラー: ${err.message}`);
    }
  };

  const handleBack = () => {
    window.history.back();
  };

 // ✅ 失注トグル（解除もできるように修正）
const handleToggleLost = async () => {
  if (!project) return;

  const message = project.lost_flag
    ? "この案件の『失注』を解除します。よろしいですか？"
    : "この案件を『失注』にします。よろしいですか？";

  if (!confirm(message)) return;

  try {
    const res = await fetch(`/api/projects/${project.id}/lost-hold`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggleLost" }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "失注ステータスの更新に失敗しました");
    }

    await refetch(); // 最新のプロジェクト情報を取得
  } catch (e) {
    alert(e.message);
  }
};


  // ✅ 保留トグル
  const handleToggleHold = async () => {
  if (!project) return;

  const message = project.hold_flag
    ? "この案件の『保留』を解除します。よろしいですか？"
    : "この案件を『保留』にします。よろしいですか？";

  if (!confirm(message)) return;

  try {
    const res = await fetch(`/api/projects/${project.id}/lost-hold`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggleHold" }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "保留ステータスの更新に失敗しました");
    }

    await refetch();
  } catch (e) {
    alert(e.message);
  }
};


  // タブの定義
  const tabs = [
    { id: "overview", label: "概要", icon: "📊" },
    { id: "logs", label: "商談ログ", icon: "📝" },
    { id: "payments", label: "支払いログ", icon: "💰" },
    { id: "activities", label: "アクティビティ", icon: "📋" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader showStaffInfo={false} onBackClick={handleBack} />
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">読み込み中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader showStaffInfo={false} onBackClick={handleBack} />
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-600">エラー: {error}</div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader showStaffInfo={false} onBackClick={handleBack} />
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">
            プロジェクトが見つかりません
          </div>
        </div>
      </div>
    );
  }

  // Pass権限の判定：プロジェクトの担当者がPasser権限を持っているかで判定
  const assignedStaff = staffMembers.find(
    (staff) => staff.code === project?.assigned_team_member,
  );
  const canPass = assignedStaff?.passer && project?.assigned_team_member;

  // GFIモードの場合の簡略表示は変更なし
  if (isGfiMode) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader showStaffInfo={false} onBackClick={handleBack} />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {/* 戻るボタン */}
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
            >
              ← 戻る
            </button>

            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              プロジェクト詳細
            </h1>

            <div className="space-y-6">
              {/* プロジェクト名 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  プロジェクト名
                </label>
                <div className="text-lg font-semibold text-gray-900">
                  {project.project_name}
                </div>
              </div>

              {/* AD番号 */}
              {project.ad_number && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    AD番号
                  </label>
                  <div className="text-lg text-gray-900">
                    AD-{project.ad_number}
                  </div>
                </div>
              )}

              {/* 設置先住所 */}
              {project.address && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    設置先住所
                  </label>
                  <div className="text-lg text-gray-900">{project.address}</div>
                </div>
              )}

              {/* ステータス */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ステータス
                </label>
                <div className="text-lg font-semibold text-gray-900">
                  {project.status}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 通常モードの詳細表示
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <DashboardHeader showStaffInfo={false} onBackClick={handleBack} />

      {/* デバッグ情報表示（必要なら見られる） */}
      {isDebugMode && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 mx-4 mt-4 rounded">
          <h3 className="font-bold">デバッグ情報</h3>
          <div className="grid grid-cols-1 gap-4 mt-2 text-sm">
            <div>
              <p>
                <strong>Project Info:</strong>
              </p>
              <p>Project ID: {project?.id || "なし"}</p>
              <p>Assigned Member: {project?.assigned_team_member || "なし"}</p>
              <p>Assigned Staff: {assignedStaff?.name || "なし"}</p>
              <p>
                Assigned Staff Passer:{" "}
                {assignedStaff?.passer ? "✓ あり" : "✗ なし"}
              </p>
              <p
                className={`font-bold ${canPass ? "text-green-600" : "text-red-600"}`}
              >
                Pass Button: {canPass ? "✓ 表示" : "✗ 非表示"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* パンくずリスト */}
      <ProjectBreadcrumbs
        projectName={project.project_name || `プロジェクト ${project.id}`}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー部分 */}
        <ProjectDetailHeader project={project} onBack={handleBack} />

        {/* タブナビゲーション */}
        <div className="mt-6 mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* タブコンテンツ */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* プロジェクト詳細情報 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 基本情報 */}
              <ProjectBasicInfo project={project} />
              {/* クライアント情報 */}
              <ProjectClientInfo project={project} />
            </div>

            {/* アクションボタン */}
            <div className="mb-20">
              <ProjectActionButtons
                canPass={canPass}
                onEdit={() => setShowEditModal(true)}
                onPass={() => setShowPassModal(true)}
                onLost={handleToggleLost}
                onHold={handleToggleHold}
                isLost={project.lost_flag}
                isHold={project.hold_flag}
              />
            </div>
          </div>
        )}

        {activeTab === "logs" && (
          <div className="space-y-6">
            {/* 商談ログセクション */}
            <ProjectLogs projectId={project.id} />
          </div>
        )}

        {activeTab === "payments" && (
          <div className="space-y-6">
            {/* 支払いログセクション */}
            <ProjectPayments projectId={project.id} />
          </div>
        )}

        {activeTab === "activities" && (
          <div className="space-y-6">
            {/* アクティビティ履歴 */}
            <ProjectActivities activities={project.activities} />
          </div>
        )}
      </div>

      {/* Pass Modal */}
      <PassProjectModal
        show={showPassModal}
        onClose={() => setShowPassModal(false)}
        staffMembers={staffMembers}
        currentAssignedId={project.assigned_team_member}
        onPass={handlePassProject}
        isLoading={passingProject}
      />

      {/* Edit Modal */}
      <NewProjectModal
        show={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={refetch}
        editProject={project}
      />

      {/* ステータス進捗バー - 固定表示 */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <StatusProgressBar
            currentStatus={project.status}
            projectId={project.id}
            project={project}
            disabled={false}
          />
        </div>
      </div>
    </div>
  );
}
