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
    if (!projects || projects.length === 0) {
      return [];
    }

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
        <DashboardHeader userId={params.userId} />

        <DashboardStats
          stats={stats}
          selectedFilter={selectedFilter}
          onFilterChange={setSelectedFilter}
        />

        <div className="px-4 lg:px-6 mb-4">
          <div className="flex justify-end">
            <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
          </div>
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

