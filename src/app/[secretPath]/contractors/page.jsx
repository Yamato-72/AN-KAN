"use client";

import { useState, useEffect } from "react";
import { Wrench, Phone, Mail, User, Plus, Search, Edit } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { MobileSearch } from "@/components/layout/MobileSearch";
import { EditContractorModal } from "@/components/contractors/EditContractorModal";

export default function ContractorsPage() {
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [filteredContractors, setFilteredContractors] = useState([]);

  // 編集モーダル用の状態
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingContractor, setEditingContractor] = useState(null);

  // フェッチ設置業者
  const fetchContractors = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/contractors");
      if (!response.ok) {
        throw new Error(`Failed to fetch contractors: ${response.status}`);
      }
      const data = await response.json();
      setContractors(data);
      setFilteredContractors(data);
    } catch (error) {
      console.error("Error fetching contractors:", error);
      setError("設置業者情報の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContractors();
  }, []);

  // 検索フィルター
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredContractors(contractors);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = contractors.filter(
      (contractor) =>
        contractor.contractor_name?.toLowerCase().includes(query) ||
        contractor.contact_person?.toLowerCase().includes(query) ||
        contractor.email?.toLowerCase().includes(query) ||
        contractor.phone_number?.toLowerCase().includes(query) ||
        contractor.company_address?.toLowerCase().includes(query),
    );
    setFilteredContractors(filtered);
  }, [searchQuery, contractors]);

  const handleNewContractor = () => {
    // 新規設置業者作成
    setEditingContractor(null);
    setShowEditModal(true);
  };

  // 編集モーダルを開く
  const handleEditContractor = (contractor) => {
    setEditingContractor(contractor);
    setShowEditModal(true);
  };

  // 編集モーダルを閉じる
  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingContractor(null);
  };

  // 編集成功時の処理
  const handleEditSuccess = () => {
    fetchContractors(); // 設置業者一覧を再取得
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          onMobileMenuClick={() => setShowMobileMenu(true)}
          onMobileSearchToggle={() => setShowMobileSearch(!showMobileSearch)}
          onNewProjectClick={handleNewContractor}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          searchPlaceholder="設置業者を検索..."
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
          onNewProjectClick={handleNewContractor}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          searchPlaceholder="設置業者を検索..."
        />
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onMobileMenuClick={() => setShowMobileMenu(true)}
        onMobileSearchToggle={() => setShowMobileSearch(!showMobileSearch)}
        onNewProjectClick={handleNewContractor}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        searchPlaceholder="設置業者を検索..."
      />

      <MobileMenu
        show={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
      />
      <MobileSearch
        show={showMobileSearch}
        onClose={() => setShowMobileSearch(false)}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        searchPlaceholder="設置業者を検索..."
      />

      {/* 編集モーダル */}
      <EditContractorModal
        show={showEditModal}
        onClose={handleCloseEditModal}
        onSuccess={handleEditSuccess}
        contractor={editingContractor}
      />

      {/* メインコンテンツ */}
      <div className="lg:pl-20">
        <div className="px-4 py-6 max-w-7xl mx-auto">
          {/* ページヘッダー */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              設置業者一覧
            </h1>
            <p className="text-gray-600">
              登録されている設置業者情報の一覧です
            </p>
          </div>

          {/* ステータスバー */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                合計 {filteredContractors.length} 件の設置業者
                {searchQuery && (
                  <span className="ml-2 text-blue-600">
                    「{searchQuery}」で検索中
                  </span>
                )}
              </div>
              <button
                onClick={handleNewContractor}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                新規設置業者
              </button>
            </div>
          </div>

          {/* 設置業者一覧 */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredContractors.map((contractor) => (
              <div
                key={contractor.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Wrench className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {contractor.contractor_name}
                      </h3>
                    </div>
                  </div>
                  <button
                    onClick={() => handleEditContractor(contractor)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="編集"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  {contractor.contact_person && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="h-4 w-4" />
                      <span>{contractor.contact_person}</span>
                    </div>
                  )}

                  {contractor.phone_number && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span>{contractor.phone_number}</span>
                    </div>
                  )}

                  {contractor.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4" />
                      <span className="break-all">{contractor.email}</span>
                    </div>
                  )}

                  {contractor.company_address && (
                    <div className="text-sm text-gray-600 mt-3 p-2 bg-gray-50 rounded">
                      <div className="font-medium mb-1">住所</div>
                      <div className="leading-relaxed">
                        {contractor.company_address}
                      </div>
                    </div>
                  )}
                </div>

                {/* プロジェクト数 */}
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-500">
                    担当プロジェクト数を表示予定
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredContractors.length === 0 && (
            <div className="text-center py-12">
              <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery
                  ? "該当する設置業者が見つかりません"
                  : "設置業者が登録されていません"}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchQuery
                  ? "検索条件を変更してお試しください"
                  : "新しい設置業者を登録してください"}
              </p>
              {!searchQuery && (
                <button
                  onClick={handleNewContractor}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 mx-auto"
                >
                  <Plus className="h-4 w-4" />
                  新規設置業者
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

