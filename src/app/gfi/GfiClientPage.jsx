// src/app/gfi/GfiClientPage.jsx
"use client";

import React from "react";
import { useGfiStats } from "@/hooks/useGfiStats";

export default function GfiClientPage() {
  const {
    data: stats,       // ← ここで data を stats という名前にリネーム
    isLoading,
    error,
  } = useGfiStats();

  if (isLoading) {
    return <div className="p-6">読み込み中です…</div>;
  }

  if (error) {
    return (
      <div className="p-6 text-red-600">
        エラーが発生しました：{String(error.message ?? error)}
      </div>
    );
  }

  if (!stats) {
    return <div className="p-6">データが取得できませんでした。</div>;
  }

  // completionTrend を安全に整形
  const completionTrend = (stats.completionTrend || []).map((item) => ({
    monthLabel: new Date(item.month).toLocaleDateString("ja-JP"),
    value: Number(item.completed_count ?? 0),
  }));

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">GFI様専用ダッシュボード</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4">
          <div className="text-sm text-gray-500">総案件数</div>
          <div className="text-2xl font-semibold">{stats.totalProjects}</div>
        </div>

        <div className="border rounded-lg p-4">
          <div className="text-sm text-gray-500">最近のアクティビティ件数</div>
          <div className="text-2xl font-semibold">
            {stats.recentActivityCount}
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <div className="text-sm text-gray-500">平均進捗率</div>
          <div className="text-2xl font-semibold">
            {stats.averageCompletion}%
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <h2 className="font-semibold mb-2">ステータス別案件数</h2>
        <ul className="space-y-1">
          <li>打ち合わせ中：{stats.meetingProjects}</li>
          <li>受注済：{stats.orderedProjects}</li>
          <li>国際発注済：{stats.internationalOrderedProjects}</li>
          <li>設置手配済：{stats.installationArrangedProjects}</li>
          <li>設置完了：{stats.installationCompletedProjects}</li>
          <li>残金請求済：{stats.paymentCompletedProjects}</li>
        </ul>
      </div>

      <div className="border rounded-lg p-4">
        <h2 className="font-semibold mb-2">完了トレンド</h2>
        {completionTrend.length === 0 ? (
          <p className="text-gray-500 text-sm">まだ完了案件はありません。</p>
        ) : (
          <ul className="list-disc ml-5 space-y-1">
            {completionTrend.map((item) => (
              <li key={item.monthLabel}>
                {item.monthLabel}：{item.value} 件
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
