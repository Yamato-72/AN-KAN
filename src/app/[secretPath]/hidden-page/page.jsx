"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";

const SORT_OPTIONS = [
  {
    value: "days-desc",
    label: "経過日数（多い順）",
    description: "現在の表示順",
  },
  { value: "urgency-asc", label: "緊急度順", description: "納期が近い順" },
  {
    value: "ad-number-desc",
    label: "AD番号（新しい順）",
    description: "最新の案件順",
  },
  {
    value: "ad-number-asc",
    label: "AD番号（古い順）",
    description: "古い案件順",
  },
  {
    value: "updated-desc",
    label: "最終更新日（新しい順）",
    description: "最近更新順",
  },
  {
    value: "updated-asc",
    label: "最終更新日（古い順）",
    description: "古い更新順",
  },
];

const useHiddenPageProjects = (sortBy = "days-desc") => {
  return useQuery({
    queryKey: ["hidden-page-projects", sortBy],
    queryFn: async () => {
      const response = await fetch("/api/projects", {
        headers: {
          "Cache-Control": "no-cache",
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch projects");
      }
      const data = await response.json();

      // 経過日数と納期までの日数を計算
      const projectsWithDays = data.map((project) => {
        const now = new Date();
        const updatedAt = new Date(project.updated_at);
        const diffTime = Math.abs(now - updatedAt);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        // 納期までの日数を計算
        let daysToDelivery = null;
        if (project.delivery_date) {
          const deliveryDate = new Date(project.delivery_date);
          const timeDiff = deliveryDate - now;
          daysToDelivery = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        }

        return {
          ...project,
          daysSinceUpdate: diffDays,
          daysToDelivery: daysToDelivery,
        };
      });

      // ソート処理
      return projectsWithDays.sort((a, b) => {
        switch (sortBy) {
          case "days-desc":
            return b.daysSinceUpdate - a.daysSinceUpdate;
          case "urgency-asc":
            // 緊急度順: 納期超過 → 納期近い順 → 納期未設定は最後
            if (a.daysToDelivery === null && b.daysToDelivery === null)
              return 0;
            if (a.daysToDelivery === null) return 1;
            if (b.daysToDelivery === null) return -1;
            return a.daysToDelivery - b.daysToDelivery;
          case "ad-number-desc":
            return (b.ad_number || 0) - (a.ad_number || 0);
          case "ad-number-asc":
            return (a.ad_number || 0) - (b.ad_number || 0);
          case "updated-desc":
            return new Date(b.updated_at) - new Date(a.updated_at);
          case "updated-asc":
            return new Date(a.updated_at) - new Date(b.updated_at);
          default:
            return b.daysSinceUpdate - a.daysSinceUpdate;
        }
      });
    },
  });
};

const getStatusColor = (status) => {
  switch (status) {
    case "打ち合わせ中":
      return "bg-gray-100 text-gray-800";
    case "受注済み":
      return "bg-blue-100 text-blue-800";
    case "国際発注済":
      return "bg-yellow-100 text-yellow-800";
    case "設置手配済":
      return "bg-orange-100 text-orange-800";
    case "設置完了":
      return "bg-green-100 text-green-800";
    case "残金請求済":
      return "bg-purple-100 text-purple-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getDaysColor = (days) => {
  if (days >= 30) return "text-red-600 font-bold";
  if (days >= 14) return "text-orange-600 font-semibold";
  if (days >= 7) return "text-yellow-600";
  return "text-gray-600";
};

const getDeliveryDaysColor = (days) => {
  if (days === null) return "text-gray-400";
  if (days < 0) return "text-red-600 font-bold"; // 納期超過
  if (days <= 3) return "text-red-500 font-semibold"; // 3日以内
  if (days <= 7) return "text-orange-500"; // 7日以内
  if (days <= 14) return "text-yellow-600"; // 14日以内
  return "text-green-600"; // 余裕あり
};

const formatDeliveryDays = (days) => {
  if (days === null) return "未設定";
  if (days < 0) return `${Math.abs(days)}日超過`;
  if (days === 0) return "本日";
  return `${days}日`;
};

export default function HiddenPage() {
  const [sortBy, setSortBy] = useState("days-desc");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const { data: projects, isLoading, error } = useHiddenPageProjects(sortBy);

  const currentSortOption = SORT_OPTIONS.find(
    (option) => option.value === sortBy,
  );

  // ドロップダウンの外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowSortDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">読み込み中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center text-red-600">
            エラーが発生しました: {error.message}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            案件ステータス監視
          </h1>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-gray-600">
              {currentSortOption?.description ||
                "ステータス更新からの経過日数順に表示しています（長い順）"}
            </p>

            {/* 並び順選択ドロップダウン */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <span className="text-sm font-medium text-gray-700">
                  並び順: {currentSortOption?.label}
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-gray-500 transition-transform ${showSortDropdown ? "rotate-180" : ""}`}
                />
              </button>

              {showSortDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <div className="py-1">
                    {SORT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSortBy(option.value);
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                          sortBy === option.value
                            ? "bg-blue-50 text-blue-700"
                            : "text-gray-700"
                        }`}
                      >
                        <div className="font-medium text-sm">
                          {option.label}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {option.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 凡例 */}
        <div className="mb-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">凡例</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 経過日数の凡例 */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                ステータス更新からの経過日数
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-600 rounded"></div>
                  <span className="text-sm text-red-600 font-bold">
                    30日以上
                  </span>
                  <span className="text-sm text-gray-500">
                    - 緊急対応が必要
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-600 rounded"></div>
                  <span className="text-sm text-orange-600 font-semibold">
                    14日以上
                  </span>
                  <span className="text-sm text-gray-500">- 注意が必要</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-600 rounded"></div>
                  <span className="text-sm text-yellow-600">7日以上</span>
                  <span className="text-sm text-gray-500">- 確認推奨</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-600 rounded"></div>
                  <span className="text-sm text-gray-600">6日以下</span>
                  <span className="text-sm text-gray-500">- 正常</span>
                </div>
              </div>
            </div>

            {/* 納期までの日数の凡例 */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                納期までの日数
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-600 rounded"></div>
                  <span className="text-sm text-red-600 font-bold">
                    納期超過
                  </span>
                  <span className="text-sm text-gray-500">- 緊急対応</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span className="text-sm text-red-500 font-semibold">
                    3日以内
                  </span>
                  <span className="text-sm text-gray-500">- 至急</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-500 rounded"></div>
                  <span className="text-sm text-orange-500">7日以内</span>
                  <span className="text-sm text-gray-500">- 準備必要</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-600 rounded"></div>
                  <span className="text-sm text-yellow-600">14日以内</span>
                  <span className="text-sm text-gray-500">- 計画的に</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-600 rounded"></div>
                  <span className="text-sm text-green-600">15日以上</span>
                  <span className="text-sm text-gray-500">- 余裕あり</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    AD番号
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    案件名
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    取引先
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    現在のステータス
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    経過日数
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    納期まで
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    最終更新日
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {projects?.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {project.ad_number}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {project.project_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {project.client_name}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          project.status,
                        )}`}
                      >
                        {project.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-sm font-medium ${getDaysColor(
                          project.daysSinceUpdate,
                        )}`}
                      >
                        {project.daysSinceUpdate}日
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-sm font-medium ${getDeliveryDaysColor(
                          project.daysToDelivery,
                        )}`}
                      >
                        {formatDeliveryDays(project.daysToDelivery)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(project.updated_at).toLocaleDateString(
                        "ja-JP",
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        },
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {projects && projects.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">案件がありません</p>
          </div>
        )}
      </div>
    </div>
  );
}

