"use client";

import { useState, useEffect } from "react";
import { User, ChevronRight } from "lucide-react";

// SECRET_PATHを固定値として定義
const SECRET_PATH =
  "x7k9m3n8q2v5w1z4p6j9r8y3e2u7i5o1a9s8d6f3g7h2j4k8l3m9n6q2w5e8r1t7y4u2i9o6p3";

export function StaffSelector() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      console.log("Fetching staff data..."); // デバッグ用ログ
      const response = await fetch("/api/staff");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Raw staff data from API:", data); // デバッグ用ログ

      // データベースから取得したスタッフのみを使用（ハードコードされたデータを排除）
      const validStaff = Array.isArray(data) ? data : [];
      console.log("Valid staff after filtering:", validStaff); // デバッグ用ログ

      // 上村宏美を仮想的な担当者として追加（DBにデータがある場合のみ全プロジェクト管理を表示）
      const finalStaffList =
        validStaff.length > 0
          ? [
              {
                id: "kamimura",
                name: "全件管理者",
                code: null,
                email: null,
                active: true,
                isVirtual: true, // 仮想ユーザーフラグ
              },
              ...validStaff,
            ]
          : [];

      console.log("Final staff list to display:", finalStaffList); // デバッグ用ログ
      setStaff(finalStaffList);
    } catch (error) {
      console.error("Error fetching staff:", error);
      setError(`担当者の読み込みに失敗しました: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">担当者を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchStaff}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

  // スタッフが存在しない場合の表示
  if (staff.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-6">
            <User size={32} className="text-gray-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            スタッフが登録されていません
          </h1>
          <p className="text-gray-600 mb-6">
            システムを利用するには、まずスタッフを登録してください。
          </p>
          <button
            onClick={fetchStaff}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      <div className="max-w-2xl mx-auto pt-16 px-4">
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <User size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            デジタルサイネージ管理システム
          </h1>
          <p className="text-gray-600">
            担当者を選択してダッシュボードにアクセスしてください
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">担当者選択</h2>
            <p className="text-sm text-gray-500 mt-1">
              登録済みスタッフ: {staff.length}名
            </p>
          </div>

          <div className="divide-y divide-gray-200">
            {staff.map((member) => {
              // 上村宏美の場合はall-projectページへ、それ以外は個別ダッシュボードへ
              const targetUrl = member.isVirtual
                ? `/${SECRET_PATH}/all-project`
                : `/${SECRET_PATH}/dashboard/${member.code}`;

              return (
                <a
                  key={member.id}
                  href={targetUrl}
                  className="block w-full p-6 hover:bg-gray-50 transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    console.log(
                      `Navigating to: ${targetUrl} for user:`,
                      member,
                    );
                    window.location.href = targetUrl;
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <User size={20} className="text-blue-600" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-gray-900">
                          {member.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {member.isVirtual
                            ? "全プロジェクト管理"
                            : `担当者コード: ${member.code}`}
                        </p>
                        <p className="text-xs text-gray-400">
                          {member.isVirtual
                            ? "全プロジェクト一覧へ移動"
                            : "個別ダッシュボードへ移動"}
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-gray-400" />
                  </div>
                </a>
              );
            })}
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500 mb-4">
            担当者が見つからない場合は管理者にお問い合わせください
          </p>
          <div className="text-xs text-gray-400">
            Digital Signage Management System v1.0
          </div>
        </div>
      </div>
    </div>
  );
}



