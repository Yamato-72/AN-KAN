"use client";

import { useState, useMemo, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { MobileSearch } from "@/components/layout/MobileSearch";
import { Breadcrumbs } from "@/components/dashboard/Breadcrumbs";
import { ProjectFilterBar } from "@/components/projects/ProjectFilterBar";
import { ProjectGrid } from "@/components/projects/ProjectGrid";
import { ProjectList } from "@/components/projects/ProjectList";
import { ViewToggle } from "@/components/projects/ViewToggle";
import { NewProjectModal } from "@/components/projects/NewProjectModal";

export default function AllProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // 表示モードの状態を追加
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  // Fetch all projects
  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/projects");
      if (!response.ok) {
        throw new Error(`プロジェクトの取得に失敗しました: ${response.status}`);
      }
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error("Error fetching projects:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle project deletion
  const handleDeleteProject = (projectId) => {
    setProjects((prevProjects) =>
      prevProjects.filter((project) => project.id !== projectId),
    );
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const filteredProjects = useMemo(() => {
    if (!projects || projects.length === 0) {
      return [];
    }

    let filtered = projects.filter((project) => {
      let matchesFilter = false;

      if (selectedFilter === "all") {
        // すべてのプロジェクトを表示
        matchesFilter = true;
      } else if (selectedFilter === "in-progress") {
        // 進行中フィルター：残金請求済み以外のすべてのステータス
        matchesFilter = project.status !== "残金請求済";
      } else if (selectedFilter === "trouble") {
        // トラブルフィルター：トラブルフラグがオンのプロジェクトのみ
        matchesFilter = project.trouble_flag === true;
      } else {
        // 個別ステータスフィルター：指定されたステータスのプロジェクトのみ
        matchesFilter = project.status === selectedFilter;
      }

      const matchesSearch =
        (project.project_name || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        project.client_name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        project.remarks?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (project.ad_number &&
          project.ad_number.toString().includes(searchQuery));

      return matchesFilter && matchesSearch;
    });

    // トラブルフィルターの場合は、トラブルフラグでソート（トラブルが上に来る）
    if (selectedFilter === "trouble") {
      filtered = filtered.sort((a, b) => {
        if (a.trouble_flag && !b.trouble_flag) return -1;
        if (!a.trouble_flag && b.trouble_flag) return 1;
        return 0;
      });
    } else {
      // その他の場合は、トラブルフラグがオンのものを上に、その後は作成日時の降順でソート
      filtered = filtered.sort((a, b) => {
        // まずトラブルフラグでソート
        if (a.trouble_flag && !b.trouble_flag) return -1;
        if (!a.trouble_flag && b.trouble_flag) return 1;

        // トラブルフラグが同じ場合は作成日時の降順
        return new Date(b.created_at) - new Date(a.created_at);
      });
    }

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

        <div className="p-4 lg:p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  全プロジェクト
                </h1>
                <p className="text-gray-600">
                  すべてのプロジェクトを表示しています
                </p>
              </div>
              <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
            </div>
          </div>
        </div>

        <ProjectFilterBar
          selectedFilter={selectedFilter}
          onFilterSelect={setSelectedFilter}
        />

        {viewMode === "grid" ? (
          <ProjectGrid
            projects={filteredProjects}
            isLoading={isLoading}
            error={error}
            onDelete={handleDeleteProject}
            showDeleteButton={true}
          />
        ) : (
          <ProjectList
            projects={filteredProjects}
            isLoading={isLoading}
            error={error}
            onDelete={handleDeleteProject}
            showDeleteButton={true}
          />
        )}
      </main>

      <NewProjectModal
        show={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
        onSuccess={fetchProjects}
      />
    </div>
  );
}

