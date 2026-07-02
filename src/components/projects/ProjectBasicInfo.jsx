"use client";

import { useState } from "react";
import {
  FileText,
  User,
  TrendingUp,
  Package,
  Calendar,
  Clock,
  MapPin,
  Tag, // Add Tag icon for product number
  Link2, // 関連元案件のリンク用
  Pencil, // 売上高の編集用
  Check, // 保存
  X, // キャンセル
} from "lucide-react";
import { formatDate, formatDateTime } from "@/utils/dateFormatters";
import { formatProjectNumber } from "@/lib/prefixes";

export function ProjectBasicInfo({ project }) {
  // 売上高のインライン編集用
  const [editingRevenue, setEditingRevenue] = useState(false);
  const [revenueValue, setRevenueValue] = useState(project.revenue ?? "");
  const [displayRevenue, setDisplayRevenue] = useState(project.revenue);
  const [savingRevenue, setSavingRevenue] = useState(false);

  const saveRevenue = async () => {
    setSavingRevenue(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revenue: revenueValue === "" ? null : revenueValue,
        }),
      });
      if (!res.ok) throw new Error();
      setDisplayRevenue(revenueValue === "" ? null : revenueValue);
      setEditingRevenue(false);
    } catch {
      alert("売上高の保存に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setSavingRevenue(false);
    }
  };

  const cancelRevenue = () => {
    setRevenueValue(displayRevenue ?? "");
    setEditingRevenue(false);
  };

  return (
    <div className="lg:col-span-2 bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">基本情報</h2>
      </div>
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FileText size={16} className="inline mr-2" />
              プロジェクト名
            </label>
            <p className="text-gray-900">{project.project_name || "未設定"}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <User size={16} className="inline mr-2" />
              担当者
            </label>
            <p className="text-gray-900">
              {project.assigned_team_member_name
                ? `${project.assigned_team_member_name} (${project.assigned_team_member_code})`
                : "未設定"}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <TrendingUp size={16} className="inline mr-2" />
              進捗
            </label>
            <p className="text-gray-900">
              {project.completion_percentage || 0}%
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Package size={16} className="inline mr-2" />
              AD番号
            </label>
            <p className="text-gray-900">
              {formatProjectNumber(project.prefix, project.ad_number || project.id)}
            </p>
          </div>

          {project.related_project_id && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Link2 size={16} className="inline mr-2" />
                関連する元案件
              </label>
              <button
                type="button"
                onClick={() => {
                  const base = window.location.pathname.replace(/\/[^/]+$/, "");
                  window.location.href = `${base}/${project.related_project_id}`;
                }}
                className="text-blue-700 hover:text-blue-900 hover:underline text-left"
              >
                {formatProjectNumber(project.related_prefix, project.related_ad_number)}
                {project.related_project_name
                  ? `　${project.related_project_name}`
                  : ""}
              </button>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar size={16} className="inline mr-2" />
              問い合わせ日
            </label>
            <p className="text-gray-900">{formatDate(project.inquiry_date)}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar size={16} className="inline mr-2" />
              納期
            </label>
            <p className="text-gray-900">{formatDate(project.delivery_date)}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar size={16} className="inline mr-2" />
              設置予定日
            </label>
            <p className="text-gray-900">
              {formatDate(project.installation_date)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <TrendingUp size={16} className="inline mr-2" />
              見積額
            </label>
            <p className="text-gray-900">
              {project.estimated_amount
                ? `¥${Number(project.estimated_amount).toLocaleString()}`
                : "未設定"}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <TrendingUp size={16} className="inline mr-2" />
              売上高
            </label>
            {editingRevenue ? (
              <div className="flex items-center gap-2">
                <span className="text-gray-500">¥</span>
                <input
                  type="number"
                  value={revenueValue}
                  onChange={(e) => setRevenueValue(e.target.value)}
                  placeholder="金額を入力"
                  className="border border-gray-300 rounded px-2 py-1 w-40 text-gray-900"
                  autoFocus
                />
                <button
                  onClick={saveRevenue}
                  disabled={savingRevenue}
                  className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                  title="保存"
                >
                  <Check size={18} />
                </button>
                <button
                  onClick={cancelRevenue}
                  disabled={savingRevenue}
                  className="p-1 text-gray-400 hover:bg-gray-100 rounded disabled:opacity-50"
                  title="キャンセル"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <p className="text-gray-900 flex items-center gap-2">
                {displayRevenue
                  ? `¥${Number(displayRevenue).toLocaleString()}`
                  : "未設定"}
                <button
                  onClick={() => setEditingRevenue(true)}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                  title="売上高を編集"
                >
                  <Pencil size={14} />
                </button>
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <MapPin size={16} className="inline mr-2" />
              設置先住所
            </label>
            <p className="text-gray-900">{project.address || "未設定"}</p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Tag size={16} className="inline mr-2" />
              製品番号
            </label>
            <p className="text-gray-900 whitespace-pre-wrap">
              {project.product_number || "未設定"}
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <MapPin size={16} className="inline mr-2" />
              設置業者
            </label>
            <p className="text-gray-900">
              {project.installation_contractor || "未設定"}
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FileText size={16} className="inline mr-2" />
              備考
            </label>
            <p className="text-gray-900 whitespace-pre-wrap">
              {project.remarks || "特になし"}
            </p>
          </div>

          {/* 作成日時と最終更新を一番下に、薄い色で表示 */}
          <div className="md:col-span-2 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  <Clock size={14} className="inline mr-2" />
                  作成日時
                </label>
                <p className="text-sm text-gray-500">
                  {formatDateTime(project.created_at)}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  <Clock size={14} className="inline mr-2" />
                  最終更新
                </label>
                <p className="text-sm text-gray-500">
                  {formatDateTime(project.updated_at)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
