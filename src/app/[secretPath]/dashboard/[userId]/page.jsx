"use client";

import { useState, useMemo, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { MobileSearch } from "@/components/layout/MobileSearch";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { ProjectGrid } from "@/components/projects/ProjectGrid";
import { ProjectList } from "@/components/projects/ProjectList";
import { ViewToggle } from "@/components/projects/ViewToggle";
import { NewProjectModal } from "@/components/projects/NewProjectModal";
import { useProjects } from "@/hooks/useProjects";
import { useDashboardStats } from "@/hooks/useDashboardStats";

export default function DashboardPage({ params }) {
  const [selectedFilter, setSelectedFilter] = useState("in-progress");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [currentStaff, setCurrentStaff] = useState(null);
  const [sortKey, setSortKey] = useState("updated_at"); // default: 更新日
  const [sortOrder, setSortOrder] = useState("desc");   // default: 新しい順

  // URLパラメータからuserIdを取得し、スタッフ情報を設定
  useEffect(() => {
    const fetchStaffInfo = async () => {
      try {
        const response = await fetch("/api/staff");
        if (!response.ok) throw new Error("Failed to fetch staff");
        const staffData = await response.json();

        // userIdに対応するスタッフを検索（codeまたはidで）
        const staff = staffData.find(
          (s) => s.code === params.userId || s.id.toString() === params.userId,
        );

        if (staff) {
          setCurrentStaff(staff);
        }
      } catch (error) {
        console.error("Error fetching staff info:", error);
      }
    };

    if (params.userId) {
      fetchStaffInfo();
    }
  }, [params.userId]);

  const {
    data: projects,
    isLoading,
    error,
    refetch: refetchProjects,
  } = useProjects(currentStaff?.code);

  const { data: stats, refetch: refetchStats } = useDashboardStats(
    currentStaff?.code,
  );

 const filteredProjects = useMemo(() => {
  if (!projects || projects.length === 0) return [];

  // ===== フィルタ + 検索 =====
  const filtered = projects.filter((project) => {
    let matchesFilter = false;

    if (selectedFilter === "trouble") {
      matchesFilter = project.trouble_flag === true;
    } else if (selectedFilter === "in-progress") {
      matchesFilter = project.status !== "残金請求済";
    } else if (selectedFilter === "残金請求済") {
      matchesFilter = project.status === "残金請求済";
    } else {
      matchesFilter = project.status === selectedFilter;
    }

    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (project.project_name || "").toLowerCase().includes(q) ||
      (project.client_name || "").toLowerCase().includes(q) ||
      (project.location || "").toLowerCase().includes(q) ||
      (project.ad_number != null && project.ad_number.toString().includes(searchQuery));

    return matchesFilter && matchesSearch;
  });

  // ===== ソート（指定5種類だけ）=====
  const toMs = (v) => {
    if (!v) return null;
    // "2025-08-19 00:00:00+00" も確実にパース
    const s = String(v).trim().replace(" ", "T").replace(/\+00$/, "+00:00");
    const t = Date.parse(s);
    return Number.isFinite(t) ? t : null;
  };

  const dir = sortOrder === "desc" ? -1 : 1;

  const sorted = [...filtered].sort((a, b) => {
    const aMs = toMs(a?.[sortKey]);
    const bMs = toMs(b?.[sortKey]);

    // 未入力は最後へ
    if (aMs == null && bMs == null) return 0;
    if (aMs == null) return 1;
    if (bMs == null) return -1;

    return (aMs - bMs) * dir;
  });

  return sorted;
}, [projects, selectedFilter, searchQuery, sortKey, sortOrder]);


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
        <DashboardHeader userId={params.userId} />

        <DashboardStats
          stats={stats}
          selectedFilter={selectedFilter}
          onFilterChange={setSelectedFilter}
        />


        <div className="flex justify-end items-center gap-2">
          {/* 並べ替え */}
          <select
            className="border rounded px-3 py-1 text-sm bg-white"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
          >
            <option value="updated_at">更新日</option>
            <option value="created_at">作成日</option>
            <option value="inquiry_date">問い合わせ日</option>
            <option value="delivery_date">納品日</option>
            <option value="installation_date">設置日</option>
          </select>

          {/* 昇順/降順 */}
          <button
            type="button"
            className="border rounded px-2 py-1 text-sm bg-white"
            title="並び順切替"
            onClick={() =>
              setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))
            }
          >
            {sortOrder === "desc" ? "▼" : "▲"}
          </button>

          {/* 表示切替 */}
          <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>


        {viewMode === "grid" ? (
          <ProjectGrid
            projects={filteredProjects}
            isLoading={isLoading}
            error={error}
          />
        ) : (
          <ProjectList
            projects={filteredProjects}
            isLoading={isLoading}
            error={error}
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
        currentUserId={params.userId}
      />
    </div>
  );
}

