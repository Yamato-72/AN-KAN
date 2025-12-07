"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Building, User } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { MobileSearch } from "@/components/layout/MobileSearch";
import { ProjectGrid } from "@/components/projects/ProjectGrid";
import { ViewToggle } from "@/components/projects/ViewToggle";
import { getStatusColor, getStatusText } from "@/utils/status";
import { createSecretUrl } from "@/utils/secretPath";

function ClientProjectsPage({ params }) {
  const [clientData, setClientData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("list"); // クライアントページはデフォルトでリスト表示
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  useEffect(() => {
    const fetchClientProjects = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/clients/${params.id}/projects`);
        if (!response.ok) {
          throw new Error(
            `Failed to fetch client projects: ${response.status}`,
          );
        }
        const data = await response.json();
        setClientData(data);
      } catch (error) {
        console.error("Error fetching client projects:", error);
        setError("クライアントプロジェクト情報の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchClientProjects();
  }, [params.id]);

  const handleProjectClick = (projectId) => {
    window.location.href = createSecretUrl(`/projects/${projectId}`);
  };

  const handleBackToClients = () => {
    window.location.href = createSecretUrl("/clients");
  };

  const formatCurrency = (amount) => {
    if (!amount) return "-";
    return `¥${Number(amount).toLocaleString()}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("ja-JP");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          onMobileMenuClick={() => setShowMobileMenu(true)}
          onMobileSearchToggle={() => setShowMobileSearch(!showMobileSearch)}
        />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          onMobileMenuClick={() => setShowMobileMenu(true)}
          onMobileSearchToggle={() => setShowMobileSearch(!showMobileSearch)}
        />
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">{error}</div>
        </div>
      </div>
    );
  }

  if (!clientData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          onMobileMenuClick={() => setShowMobileMenu(true)}
          onMobileSearchToggle={() => setShowMobileSearch(!showMobileSearch)}
        />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">クライアント情報が見つかりません</div>
        </div>
      </div>
    );
  }

  const { client, projects } = clientData;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onMobileMenuClick={() => setShowMobileMenu(true)}
        onMobileSearchToggle={() => setShowMobileSearch(!showMobileSearch)}
      />

      <MobileMenu
        show={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
      />
      <MobileSearch
        show={showMobileSearch}
        onClose={() => setShowMobileSearch(false)}
      />

      <div className="lg:pl-20">
        <div className="px-4 py-6 max-w-7xl mx-auto">
          {/* 戻るボタン */}
          <button
            onClick={handleBackToClients}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            クライアント一覧に戻る
          </button>

          {/* クライアント情報ヘッダー */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {client.client_name}
                  </h1>
                  <p className="text-gray-600">関連プロジェクト一覧</p>
                </div>
              </div>
              {/* プロジェクトがある場合のみ表示切り替えボタンを表示 */}
              {projects.length > 0 && (
                <ViewToggle
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                />
              )}
            </div>

            {/* クライアント詳細情報 */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              {client.contact_person && (
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="h-4 w-4" />
                  <span>{client.contact_person}</span>
                </div>
              )}
              {client.phone_number && (
                <div className="text-gray-600">
                  <span className="font-medium">電話:</span>{" "}
                  {client.phone_number}
                </div>
              )}
              {client.email && (
                <div className="text-gray-600">
                  <span className="font-medium">Email:</span> {client.email}
                </div>
              )}
              <div className="text-gray-600">
                <span className="font-medium">プロジェクト数:</span>{" "}
                {projects.length}件
              </div>
            </div>

            {client.company_address && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-700 mb-1">
                  住所
                </div>
                <div className="text-sm text-gray-600">
                  {client.company_address}
                </div>
              </div>
            )}
          </div>

          {/* プロジェクト一覧 */}
          {projects.length > 0 ? (
            viewMode === "grid" ? (
              <ProjectGrid
                projects={projects}
                isLoading={loading}
                error={error}
              />
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    プロジェクト一覧 ({projects.length}件)
                  </h2>
                </div>

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
                          担当者
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ステータス
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          見積額
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          問合日
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {projects.map((project) => (
                        <tr
                          key={project.id}
                          className="hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => handleProjectClick(project.id)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {project.ad_number
                              ? `AD-${project.ad_number}`
                              : "-"}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <div className="max-w-xs truncate">
                              {project.project_name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {project.assigned_team_member_name || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                                project.status,
                              )}`}
                            >
                              {getStatusText(project.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {formatCurrency(project.estimated_amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {formatDate(project.inquiry_date)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                関連プロジェクトがありません
              </h3>
              <p className="text-gray-500">
                このクライアントに関連するプロジェクトはまだ登録されていません。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ClientProjectsPage;


