import {
  FileText,
  User,
  TrendingUp,
  Package,
  Calendar,
  Clock,
  MapPin,
  Tag, // Add Tag icon for product number
} from "lucide-react";
import { formatDate, formatDateTime } from "@/utils/dateFormatters";

export function ProjectBasicInfo({ project }) {
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
              AD-{project.ad_number || project.id}
            </p>
          </div>

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
            <p className="text-gray-900">
              {project.revenue
                ? `¥${Number(project.revenue).toLocaleString()}`
                : "未設定"}
            </p>
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



