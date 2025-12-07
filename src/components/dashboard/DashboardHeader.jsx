"use client";

import { useState, useEffect } from "react";
import { User } from "lucide-react";
import { createSecretUrl } from "@/utils/secretPath";

export const DashboardHeader = ({
  showStaffInfo = true,
  userId = null,
  onBackClick = null, // 戻る機能のためのコールバック
}) => {
  const [currentStaff, setCurrentStaff] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStaffInfo = async () => {
      if (!userId) {
        // userIdが指定されていない場合は、従来通りlocalStorageから取得
        const staffData = localStorage.getItem("selectedStaff");
        if (staffData) {
          setCurrentStaff(JSON.parse(staffData));
        }
        return;
      }

      try {
        setLoading(true);
        const response = await fetch("/api/staff");
        if (!response.ok) throw new Error("Failed to fetch staff");
        const staffData = await response.json();

        // userIdに対応するスタッフを検索（codeまたはidで）
        const staff = staffData.find(
          (s) => s.code === userId || s.id.toString() === userId,
        );

        if (staff) {
          setCurrentStaff(staff);
        } else {
          console.warn(`Staff not found for userId: ${userId}`);
          setCurrentStaff(null);
        }
      } catch (error) {
        console.error("Error fetching staff info:", error);
        setCurrentStaff(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStaffInfo();
  }, [userId]);

  const handleTitleClick = () => {
    if (onBackClick) {
      onBackClick(); // 戻る機能が提供されている場合
    } else {
      window.location.href = createSecretUrl("/"); // デフォルトはトップページ
    }
  };

  return (
    <div className="px-4 lg:pl-24 pt-2">
      <div className="mb-4 lg:mb-6">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={handleTitleClick}
              className="text-2xl lg:text-3xl font-semibold text-gray-700 mb-2 hover:text-blue-600 transition-colors cursor-pointer inline-block"
            >
              AN-KAN
            </button>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span>プロジェクトの進捗管理と状況確認</span>
              {onBackClick && (
                <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs">
                  ← クリックで戻る
                </span>
              )}
              {userId && (
                <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  ユーザー: {userId}
                </span>
              )}
            </div>
          </div>
          {showStaffInfo && (
            <div className="flex items-center space-x-3 bg-blue-50 px-4 py-2 rounded-lg">
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-gray-600">読み込み中...</span>
                </div>
              ) : currentStaff ? (
                <>
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {currentStaff.code}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {currentStaff.name}
                    </p>
                    <p className="text-xs text-gray-600">
                      ID: {currentStaff.id} | Code: {currentStaff.code}
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex items-center space-x-2">
                  <User size={20} className="text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {userId
                      ? `ユーザー ${userId} が見つかりません`
                      : "ユーザー未選択"}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};



