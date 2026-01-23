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

  // ✅ all があるならフィルタで特別扱いする
  const [selectedFilter, setSelectedFilter] = useState("all");

  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  // ✅ 並べ替え state（これが無いとソートが動かない）
  const [sortKey, setSortKey] = useState("updated_at"); // default: 更新日
  const [sortOrder, setSortOrder] = useState("desc");   // default: 新しい順

  // Fetch all projects
  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/projects?folder=active");
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
      prevProjects.filter((project) => project.id !== projectId)
    );
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const filteredProjects = useMemo(() => {
    if (!projects || projects.length === 0) return [];

    const filtered = projects.filter((project) => {
      let matchesFilter = false;

      // ✅ "all" は全件通す
      if (selectedFilter === "all") {
        matchesFilter = true;
      } else if (selectedFilter === "trouble") {
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
        (project.ad_number != null &&
          project.ad_number.toString().includes(searchQuery));

      return matchesFilter && matchesSearch;
    });

    // ===== sort（キー名のズレ吸収）=====
    const keyMap = {
      updated_at: ["updated_at", "updatedAt"],
      created_at: ["created_at", "createdAt"],
      inquiry_date: ["inquiry_date", "inquiryDate"],
      delivery_date: ["delivery_date", "deliveryDate"],
      installation_date: ["installation_date", "installationDate"],
    };

    const pick = (obj, key) => {
      const keys = keyMap[key] || [key];
      for (const k of keys) {
        const v = obj?.[k];
        if (v != null && v !== "") return v;
      }
      return null;
    };

    // ✅ "2025-08-19 00:00:00+00" 形式も確実にパース
    const toMs = (v) => {
      if (!v) return null;
      const s = String(v).trim().replace(" ", "T").replace(/\+00$/, "+00:00");
      const t = Date.parse(s);
      return Number.isFinite(t) ? t : null;
    };

    const dir = sortOrder === "desc" ? -1 : 1;

    return [...filtered].sort((a, b) => {
      const aMs = toMs(pick(a, sortKey));
      const bMs = toMs(pick(b, sortKey));

      // 未入力は最後
      if (aMs == null && bMs == null) return 0;
      if (aMs == null) return 1;
      if (bMs == null) return -1;

      return (aMs - bMs) * dir;
    });
  }, [projects, selectedFilter, searchQuery, sortKey, sortOrder]);

  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      <Sidebar />
      <MobileMenu show={showMobileMenu} onClose={() => setShowMobileMenu(false)} />

      <Header
        onMobileMenuClick={() => setShowMobileMenu(true)}
        onMobileSearchToggle={() => setShowMobileSearch(!showMobileSearch)}
        onNewProjectClick={() => setShowNewProjectModal(true)}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
      />

      <MobileSearch show={showMobileSearch} query={searchQuery} onQueryChange={setSearchQuery} />

      <main className="lg:ml-16">
        <Breadcrumbs />

        <div className="p-4 lg:p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">全プロジェクト</h1>
                <p className="text-gray-600">すべてのプロジェクトを表示しています</p>
              </div>

              <div className="flex items-center gap-2">
                {/* ✅ 並べ替え */}
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

                <button
                  type="button"
                  className="border rounded px-2 py-1 text-sm bg-white"
                  title="並び順切替"
                  onClick={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
                >
                  {sortOrder === "desc" ? "▼" : "▲"}
                </button>

                <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
              </div>
            </div>
          </div>
        </div>

        console.log(filteredProjects.slice(0,5).map(p=>p.updated_at))

        <ProjectFilterBar selectedFilter={selectedFilter} onFilterSelect={setSelectedFilter} />

        {viewMode === "grid" ? (
          <ProjectGrid
            key={`${sortKey}-${sortOrder}-grid`}  // ✅ 念のため強制再描画（保険）
            projects={filteredProjects}
            isLoading={isLoading}
            error={error}
            onDelete={handleDeleteProject}
            showDeleteButton={true}
          />
        ) : (
          <ProjectList
            key={`${sortKey}-${sortOrder}-list`}  // ✅ 念のため強制再描画（保険）
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
