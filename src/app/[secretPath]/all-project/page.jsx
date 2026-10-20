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
import { ViewScopeSwitch } from "@/components/ViewScopeSwitch";
import { NewProjectModal } from "@/components/projects/NewProjectModal";
import CSVImportModal from "@/components/projects/CSVImportModal";

export default function AllProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ all があるならフィルタで特別扱いする
  const [selectedFilter, setSelectedFilter] = useState("all");

  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false); // 過去案件CSV取り込み
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  // ✅ 並べ替え state（これが無いとソートが動かない）
  const [sortKey, setSortKey] = useState("updated_at"); // default: 更新日
  const [periodFilter, setPeriodFilter] = useState("all"); // 期の絞り込み（全期間がデフォルト）
  const [sortOrder, setSortOrder] = useState("desc"); // default: 新しい順

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

  // 案件の「期」を計算（7月始まり・1期=2019年7月〜）
  //   判定日は 納期 → 問い合わせ日 → 作成日 の優先順
  const periodOf = (project) => {
    const dateStr =
      project.delivery_date || project.inquiry_date || project.created_at;
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d)) return null;
    const fyStartYear = d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
    return fyStartYear - 2019 + 1; // 1期 = 2019年7月〜
  };

  // データに実在する期の一覧（新しい順）。選択肢はここから自動生成
  const availablePeriods = useMemo(() => {
    const set = new Set();
    (projects || []).forEach((p) => {
      const n = periodOf(p);
      if (n && n > 0) set.add(n);
    });
    return [...set].sort((a, b) => b - a);
  }, [projects]);

  const filteredProjects = useMemo(() => {
    if (!projects || projects.length === 0) return [];

    const filtered = projects.filter((project) => {
      let matchesFilter = false;

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

      // 期の絞り込み
      const matchesPeriod =
        periodFilter === "all" || periodOf(project) === Number(periodFilter);

      return matchesFilter && matchesSearch && matchesPeriod;
    });

    const keyMap = {
      updated_at: ["updated_at", "updatedAt"],
      created_at: ["created_at", "createdAt"],
      inquiry_date: ["inquiry_date", "inquiryDate"],
      delivery_date: ["delivery_date", "deliveryDate"],
      installation_date: ["installation_date", "installationDate"],
      ad_number: ["ad_number"],
    };

    const pick = (obj, key) => {
      const keys = keyMap[key] || [key];
      for (const k of keys) {
        const v = obj?.[k];
        if (v != null && v !== "") return v;
      }
      return null;
    };

    const toMs = (v) => {
      if (!v) return null;
      const s = String(v).replace(" ", "T").replace(/\+00$/, "+00:00");
      const t = Date.parse(s);
      return Number.isFinite(t) ? t : null;
    };

    const dir = sortOrder === "desc" ? -1 : 1;

    const sorted = [...filtered].sort((a, b) => {
      // ✅ AD番号専用ソート（0始まり保持 / number化されてても落ちない）
      if (sortKey === "ad_number") {
        const aRaw = pick(a, "ad_number");
        const bRaw = pick(b, "ad_number");

        if (aRaw == null && bRaw == null) return 0;
        if (aRaw == null) return 1;
        if (bRaw == null) return -1;

        // ✅ ここが重要：必ず文字列にする
        const aVal = String(aRaw);
        const bVal = String(bRaw);

        // 桁揃え（最大桁数に合わせる）
        const maxLen = Math.max(aVal.length, bVal.length);
        const aPadded = aVal.padStart(maxLen, "0");
        const bPadded = bVal.padStart(maxLen, "0");

        return aPadded.localeCompare(bPadded) * dir;
      }

      // ▼ それ以外（日付系）は今まで通り
      const aMs = toMs(pick(a, sortKey));
      const bMs = toMs(pick(b, sortKey));

      if (aMs == null && bMs == null) return 0;
      if (aMs == null) return 1;
      if (bMs == null) return -1;

      return (aMs - bMs) * dir;
    });

    return sorted; // ← ★ これが無いと絶対に反映されない
  }, [projects, selectedFilter, searchQuery, sortKey, sortOrder, periodFilter]);

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

      <MobileSearch
        show={showMobileSearch}
        query={searchQuery}
        onQueryChange={setSearchQuery}
      />

      <main className="lg:ml-16">
        <Breadcrumbs />
        <div className="mb-4"><ViewScopeSwitch current="all" /></div>

        <div className="p-4 lg:p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">全プロジェクト</h1>
                <p className="text-gray-600">すべてのプロジェクトを表示しています</p>
              </div>

              <div className="flex items-center gap-2">
                {/* 期の絞り込み（データに実在する期だけが選択肢に出る） */}
                <select
                  className={`border rounded px-3 py-1 text-sm bg-white ${
                    periodFilter !== "all" ? "border-blue-400 text-blue-700 font-semibold" : ""
                  }`}
                  value={periodFilter}
                  onChange={(e) => setPeriodFilter(e.target.value)}
                  title="期で絞り込み（7月始まり）"
                >
                  <option value="all">全期間</option>
                  {availablePeriods.map((n) => (
                    <option key={n} value={n}>
                      第{n}期
                    </option>
                  ))}
                </select>

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
                  <option value="ad_number">AD番号</option>
                </select>

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

                <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />

                <button
                  onClick={() => setShowImportModal(true)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 whitespace-nowrap"
                  title="過去案件のCSV取り込み（Driveフォルダは作成されません）"
                >
                  CSVインポート
                </button>
              </div>
            </div>
          </div>
        </div>

        <ProjectFilterBar selectedFilter={selectedFilter} onFilterSelect={setSelectedFilter} />

        {viewMode === "grid" ? (
          <ProjectGrid
            key={`${sortKey}-${sortOrder}-grid`} // ✅ 念のため強制再描画（保険）
            projects={filteredProjects}
            isLoading={isLoading}
            error={error}
            onDelete={handleDeleteProject}
            showDeleteButton={true}
          />
        ) : (
          <ProjectList
            key={`${sortKey}-${sortOrder}-list`} // ✅ 念のため強制再描画（保険）
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

      {/* 過去案件のCSV取り込み（importはDriveフォルダを作らない） */}
      <CSVImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={fetchProjects}
      />
    </div>
  );
}
