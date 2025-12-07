"use client";

import { useState, useEffect } from "react";
import { Building, Phone, Mail, User, Plus, Search, Edit } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { MobileSearch } from "@/components/layout/MobileSearch";
import { EditClientModal } from "@/components/clients/EditClientModal";

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [filteredClients, setFilteredClients] = useState([]);

  // 編集モーダル用の状態
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  // フェッチクライアント
  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/clients");
      if (!response.ok) {
        throw new Error(`Failed to fetch clients: ${response.status}`);
      }
      const data = await response.json();
      setClients(data);
      setFilteredClients(data);
    } catch (error) {
      console.error("Error fetching clients:", error);
      setError("クライアント情報の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // 検索フィルター
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredClients(clients);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = clients.filter(
      (client) =>
        client.client_name?.toLowerCase().includes(query) ||
        client.contact_person?.toLowerCase().includes(query) ||
        client.email?.toLowerCase().includes(query) ||
        client.phone_number?.toLowerCase().includes(query) ||
        client.company_address?.toLowerCase().includes(query),
    );
    setFilteredClients(filtered);
  }, [searchQuery, clients]);

  const handleNewClient = () => {
    // TODO: 新規クライアント作成モーダルを開く
    alert("新規クライアント作成機能は後で実装予定です");
  };

  // 編集モーダルを開く
  const handleEditClient = (client) => {
    setEditingClient(client);
    setShowEditModal(true);
  };

  // 編集モーダルを閉じる
  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingClient(null);
  };

  // 編集成功時の処理
  const handleEditSuccess = () => {
    fetchClients(); // クライアント一覧を再取得
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          onMobileMenuClick={() => setShowMobileMenu(true)}
          onMobileSearchToggle={() => setShowMobileSearch(!showMobileSearch)}
          onNewProjectClick={handleNewClient}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          searchPlaceholder="クライアントを検索..."
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
          onNewProjectClick={handleNewClient}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          searchPlaceholder="クライアントを検索..."
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
        onNewProjectClick={handleNewClient}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        searchPlaceholder="クライアントを検索..."
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
        searchPlaceholder="クライアントを検索..."
      />

      {/* 編集モーダル */}
      <EditClientModal
        show={showEditModal}
        onClose={handleCloseEditModal}
        onSuccess={handleEditSuccess}
        client={editingClient}
      />

      {/* メインコンテンツ */}
      <div className="lg:pl-20">
        <div className="px-4 py-6 max-w-7xl mx-auto">
          {/* ページヘッダー */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              クライアント一覧
            </h1>
            <p className="text-gray-600">
              登録されているクライアント情報の一覧です
            </p>
          </div>

          {/* ステータスバー */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                合計 {filteredClients.length} 件のクライアント
                {searchQuery && (
                  <span className="ml-2 text-blue-600">
                    「{searchQuery}」で検索中
                  </span>
                )}
              </div>
              <button
                onClick={handleNewClient}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                新規クライアント
              </button>
            </div>
          </div>

          {/* クライアント一覧 */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredClients.map((client) => (
              <div
                key={client.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Building className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {client.client_name}
                      </h3>
                    </div>
                  </div>
                  <button
                    onClick={() => handleEditClient(client)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="編集"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  {client.contact_person && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="h-4 w-4" />
                      <span>{client.contact_person}</span>
                    </div>
                  )}

                  {client.phone_number && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span>{client.phone_number}</span>
                    </div>
                  )}

                  {client.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4" />
                      <span className="break-all">{client.email}</span>
                    </div>
                  )}

                  {client.company_address && (
                    <div className="text-sm text-gray-600 mt-3 p-2 bg-gray-50 rounded">
                      <div className="font-medium mb-1">住所</div>
                      <div className="leading-relaxed">
                        {client.company_address}
                      </div>
                    </div>
                  )}
                </div>

                {/* プロジェクト数 */}
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <button
                    onClick={() =>
                      (window.location.href = `/x7k9m3n8q2v5w1z4p6j9r8y3e2u7i5o1a9s8d6f3g7h2j4k8l3m9n6q2w5e8r1t7y4u2i9o6p3/clients/${client.id}/projects`)
                    }
                    className="text-xs text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                  >
                    関連プロジェクト: {client.project_count || 0} 件
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredClients.length === 0 && (
            <div className="text-center py-12">
              <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery
                  ? "該当するクライアントが見つかりません"
                  : "クライアントが登録されていません"}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchQuery
                  ? "検索条件を変更してお試しください"
                  : "新しいクライアントを登録してください"}
              </p>
              {!searchQuery && (
                <button
                  onClick={handleNewClient}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 mx-auto"
                >
                  <Plus className="h-4 w-4" />
                  新規クライアント
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


