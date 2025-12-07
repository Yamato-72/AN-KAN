import {
  TrendingUp,
  UserPlus,
  FileText,
  Trash2,
  Edit,
  User,
  Calendar,
  MapPin,
  Package,
  Clock,
} from "lucide-react";
import { formatDateTime } from "@/utils/dateFormatters";

export function ActivityItem({ activity }) {
  const getActivityDisplay = (activityType, description) => {
    switch (activityType) {
      case "status_update":
        return {
          icon: <TrendingUp size={16} />,
          color: "bg-blue-500",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
          title: "ステータス変更",
          description: description,
        };
      case "assignment_change":
      case "assignee_update":
        return {
          icon: <UserPlus size={16} />,
          color: "bg-orange-500",
          bgColor: "bg-orange-50",
          borderColor: "border-orange-200",
          title: "担当者変更",
          description: description,
        };
      case "log_added":
        return {
          icon: <FileText size={16} />,
          color: "bg-green-500",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          title: "ログ追加",
          description: description,
        };
      case "log_deleted":
        return {
          icon: <Trash2 size={16} />,
          color: "bg-red-500",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          title: "ログ削除",
          description: description,
        };
      case "project_created":
        return {
          icon: <FileText size={16} />,
          color: "bg-green-500",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          title: "プロジェクト作成",
          description: description,
        };
      case "project_updated":
      case "name_update":
        return {
          icon: <Edit size={16} />,
          color: "bg-purple-500",
          bgColor: "bg-purple-50",
          borderColor: "border-purple-200",
          title: "プロジェクト名変更",
          description: description,
        };
      case "client_update":
        return {
          icon: <User size={16} />,
          color: "bg-indigo-500",
          bgColor: "bg-indigo-50",
          borderColor: "border-indigo-200",
          title: "取引先名変更",
          description: description,
        };
      case "remarks_update":
        return {
          icon: <FileText size={16} />,
          color: "bg-emerald-500",
          bgColor: "bg-emerald-50",
          borderColor: "border-emerald-200",
          title: "備考変更",
          description: description,
        };
      case "inquiry_date_update":
        return {
          icon: <Calendar size={16} />,
          color: "bg-cyan-500",
          bgColor: "bg-cyan-50",
          borderColor: "border-cyan-200",
          title: "問い合わせ日変更",
          description: description,
        };
      case "delivery_date_update":
        return {
          icon: <Calendar size={16} />,
          color: "bg-teal-500",
          bgColor: "bg-teal-50",
          borderColor: "border-teal-200",
          title: "納期変更",
          description: description,
        };
      case "installation_date_update":
        return {
          icon: <Calendar size={16} />,
          color: "bg-pink-500",
          bgColor: "bg-pink-50",
          borderColor: "border-pink-200",
          title: "設置日変更",
          description: description,
        };
      case "contractor_update":
        return {
          icon: <MapPin size={16} />,
          color: "bg-amber-500",
          bgColor: "bg-amber-50",
          borderColor: "border-amber-200",
          title: "設置業者変更",
          description: description,
        };
      case "ad_number_update":
        return {
          icon: <Package size={16} />,
          color: "bg-slate-500",
          bgColor: "bg-slate-50",
          borderColor: "border-slate-200",
          title: "AD番号変更",
          description: description,
        };
      default:
        return {
          icon: <Clock size={16} />,
          color: "bg-gray-500",
          bgColor: "bg-gray-50",
          borderColor: "border-gray-200",
          title: "その他",
          description: description,
        };
    }
  };

  const activityDisplay = getActivityDisplay(
    activity.activity_type,
    activity.description,
  );

  const renderStatusUpdateDetails = () => {
    const description = activity.description;

    // ステータス変更部分を抽出
    const statusMatch = description.match(/「(.+?)」から「(.+?)」に変更/);
    if (!statusMatch) {
      return <span>{description}</span>;
    }

    const [, fromStatus, toStatus] = statusMatch;

    // 追加情報を抽出
    const additionalInfo = [];

    // 設置業者
    const contractorMatch = description.match(/（設置業者: (.+?)）/);
    if (contractorMatch) {
      additionalInfo.push(`設置業者: ${contractorMatch[1]}`);
    }

    // 設置日
    const installationDateMatch = description.match(/（設置日: (.+?)）/);
    if (installationDateMatch) {
      additionalInfo.push(`設置日: ${installationDateMatch[1]}`);
    }

    // 売上高
    const revenueMatch = description.match(/（売上高: (.+?)）/);
    if (revenueMatch) {
      additionalInfo.push(`売上高: ${revenueMatch[1]}`);
    }

    // 納期
    const deliveryDateMatch = description.match(/（納期: (.+?)）/);
    if (deliveryDateMatch) {
      additionalInfo.push(`納期: ${deliveryDateMatch[1]}`);
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
            {fromStatus}
          </span>
          <span className="text-gray-400">→</span>
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
            {toStatus}
          </span>
        </div>
        {additionalInfo.length > 0 && (
          <div className="mt-2 space-y-1">
            <div className="text-xs font-medium text-gray-600">
              追加で更新された情報:
            </div>
            {additionalInfo.map((info, index) => (
              <div key={index} className="text-xs text-gray-600 ml-2">
                • {info}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`flex items-start space-x-4 p-4 ${activityDisplay.bgColor} ${activityDisplay.borderColor} border rounded-lg`}
    >
      <div
        className={`flex-shrink-0 w-8 h-8 ${activityDisplay.color} text-white rounded-full flex items-center justify-center`}
      >
        {activityDisplay.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <h4 className="text-sm font-medium text-gray-900">
            {activityDisplay.title}
          </h4>
          <span className="text-xs text-gray-500">
            {formatDateTime(activity.created_at)}
          </span>
        </div>
        <div className="mt-1">
          {activity.activity_type === "status_update" ? (
            <div className="text-sm text-gray-700">
              {renderStatusUpdateDetails()}
            </div>
          ) : (
            <p className="text-sm text-gray-700">
              {activityDisplay.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}



