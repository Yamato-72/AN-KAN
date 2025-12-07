"use client";

import { useState, useMemo, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { MobileSearch } from "@/components/layout/MobileSearch";
import { Breadcrumbs } from "@/components/dashboard/Breadcrumbs";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { ProjectFilterBar } from "@/components/projects/ProjectFilterBar";
import { ProjectGrid } from "@/components/projects/ProjectGrid";
import { ProjectList } from "@/components/projects/ProjectList";
import { ViewToggle } from "@/components/projects/ViewToggle";
import { NewProjectModal } from "@/components/projects/NewProjectModal";
import { useGfiProjects } from "@/hooks/useGfiProjects";
import { useGfiStats } from "@/hooks/useGfiStats";

// ページタイトルを設定
export const metadata = {
  title: "GFI様専用ページ",
};

export default function GfiPage() {
  const [selectedFilter, setSelectedFilter] = useState("in-progress");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // 表示モードの状態を追加
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [currentStaff, setCurrentStaff] = useState(null);

  // Set document title using useEffect
  useEffect(() => {
    document.title = "GFI様専用ページ";
  }, []);

  // Get current staff from localStorage (optional)
  useEffect(() => {
    const staffData = localStorage.getItem("selectedStaff");
    if (staffData) {
      const staff = JSON.parse(staffData);
      setCurrentStaff(staff);
    }
    // スタッフが選択されていなくても全プロジェクトを表示
  }, []);

  const {
    data: projects,
    isLoading,
    error,
    refetch: refetchProjects,
  } = useGfiProjects(); // currentStaff?.codeを削除してすべてのGFIプロジェクトを取得

  const {
    data: stats,
    refetch: refetchStats,
    isLoading: isStatsLoading,
    error: statsError,
  } = useGfiStats();

  const filteredProjects = useMemo(() => {
    if (!projects || projects.length === 0) {
      return [];
    }

    const filtered = projects.filter((project) => {
      let matchesFilter = false;

      if (selectedFilter === "trouble") {
        // トラブルフィルター：トラブルフラグがオンのプロジェクトのみ
        matchesFilter = project.trouble_flag === true;
      } else if (selectedFilter === "in-progress") {
        // 進行中フィルター：残金請求済以外のすべてのステータス（リードも含む）、またはトラブルフラグがオンの場合
        matchesFilter =
          project.status !== "残金請求済" || project.trouble_flag === true;
      } else if (selectedFilter === "残金請求済") {
        // 残金請求済フィルター：残金請求済のステータス、ただしトラブルフラグがオンの場合は除外
        matchesFilter =
          project.status === "残金請求済" && project.trouble_flag !== true;
      } else {
        // 個別ステータスフィルター：指定されたステータス、またはトラブルフラグがオンの場合
        matchesFilter =
          project.status === selectedFilter || project.trouble_flag === true;
      }

      const matchesSearch =
        (project.project_name || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        project.client_name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        project.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (project.ad_number &&
          project.ad_number.toString().includes(searchQuery));

      return matchesFilter && matchesSearch;
    });

    return filtered;
  }, [projects, selectedFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      <Sidebar />
      <MobileMenu
        show={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
      />

      <Header
        onMobileMenuClick={() => setShowMobileMenu(true)}
        onMobileSearchToggle={() => setShowMobileSearch(!showMobileSearch)}
        onNewProjectClick={() => setShowNewProjectModal(true)}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
      />

      <MobileSearch
        show={showMobileSearch}
        query={searchQuery}
        onQueryChange={setSearchQuery}
      />

      <main className="lg:ml-16">
        <Breadcrumbs />
        <DashboardHeader showStaffInfo={false} />

        {/* 統計情報を最初に表示 */}
        <DashboardStats stats={stats} />

        <ProjectFilterBar
          selectedFilter={selectedFilter}
          onFilterSelect={setSelectedFilter}
        />

        {/* ViewToggleをProjectFilterBarの後に配置 */}
        <div className="px-4 lg:px-6 mb-4">
          <div className="flex justify-end">
            <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
          </div>
        </div>

        {/* 表示モードに応じてコンポーネントを切り替え */}
        {viewMode === "grid" ? (
          <ProjectGrid
            projects={filteredProjects}
            isLoading={isLoading}
            error={error}
            showGfiFlag={false} // GFIページではGFIフラグボタンを非表示にする
            isGfiMode={true} // GFIページからのアクセスであることを示す
          />
        ) : (
          <ProjectList
            projects={filteredProjects}
            isLoading={isLoading}
            error={error}
            showGfiFlag={false}
            isGfiMode={true}
          />
        )}
      </main>

      <NewProjectModal
        show={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
        onSuccess={() => {
          refetchProjects();
          refetchStats();
        }}
      />
    </div>
  );
}



