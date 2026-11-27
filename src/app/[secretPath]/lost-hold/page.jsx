"use client";
import { matchesProjectSearch } from "@/lib/projectSearch";

import { useState, useEffect, useMemo } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { MobileSearch } from "@/components/layout/MobileSearch";
import { Breadcrumbs } from "@/components/dashboard/Breadcrumbs";
import { ProjectGrid } from "@/components/projects/ProjectGrid";
import { ProjectList } from "@/components/projects/ProjectList";
import { ViewToggle } from "@/components/projects/ViewToggle";

export default function LostHoldProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState("lost"); // "lost" | "hold"
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  // 失注 or 保留の一覧取得
const fetchProjects = async () => {
  try {
    setIsLoading(true);
    setError(null);

    // activeTab は "lost" か "hold"
    const queryParam = `folder=${activeTab}`;

    const response = await fetch(`/api/projects?${queryParam}`);
    if (!response.ok) {
      throw new Error(
        `プロジェクトの取得に失敗しました: ${response.status}`
      );
    }
    const data = await response.json();
    setProjects(data);
  } catch (e) {
    console.error("Error fetching lost/hold projects:", e);
    setError(e.message);
  } finally {
    setIsLoading(false);
  }
};


  // タブが変わるたびに再取得
  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // 一覧から削除されたときのローカル反映（実際に削除するかどうかは運用次第）
  const handleDeleteProject = (projectId) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  };

  // 検索＆ソート
  const filteredProjects = useMemo(() => {
    if (!projects || projects.length === 0) return [];

    const q = searchQuery.toLowerCase();

    let filtered = projects.filter((project) => {
      const matchesSearch = matchesProjectSearch(project, searchQuery);

      return matchesSearch;
    });

    // 作成日時の降順 + トラブルは上に
    filtered = filtered.sort((a, b) => {
      if (a.trouble_flag && !b.trouble_flag) return -1;
      if (!a.trouble_flag && b.trouble_flag) return 1;

      return new Date(b.created_at) - new Date(a.created_at);
    });

    return filtered;
  }, [projects, searchQuery]);

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
        onNewProjectClick={null} // このページでは新規ボタンは使わない
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
                  失注・保留案件
                </h1>
                <p className="text-gray-600">
                  失注または保留になっている案件を一覧表示します
                </p>
              </div>

              <ViewToggle
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />
            </div>

            {/* タブ（失注 / 保留） */}
            <div className="mt-4 border-b border-gray-200">
              <nav className="-mb-px flex space-x-4">
                <button
                  type="button"
                  onClick={() => setActiveTab("lost")}
                  className={`py-2 px-3 border-b-2 text-sm font-medium ${
                    activeTab === "lost"
                      ? "border-red-500 text-red-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  🔻 失注案件
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("hold")}
                  className={`py-2 px-3 border-b-2 text-sm font-medium ${
                    activeTab === "hold"
                      ? "border-yellow-500 text-yellow-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  ⏸ 保留案件
                </button>
              </nav>
            </div>
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* 一覧表示 */}
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
        </div>
      </main>
    </div>
  );
}
