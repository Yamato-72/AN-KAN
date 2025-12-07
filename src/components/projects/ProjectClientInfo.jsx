import { User, MapPin, Phone, Mail, UserCheck } from "lucide-react";

export function ProjectClientInfo({ project }) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          クライアント情報
        </h2>
      </div>
      <div className="px-6 py-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <User size={16} className="inline mr-2" />
            取引先名
          </label>
          <p className="text-gray-900">{project.client_name || "未設定"}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <MapPin size={16} className="inline mr-2" />
            会社住所
          </label>
          <p className="text-gray-900">{project.company_address || "未設定"}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Phone size={16} className="inline mr-2" />
            電話番号
          </label>
          <p className="text-gray-900">{project.phone_number || "未設定"}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <UserCheck size={16} className="inline mr-2" />
            担当者名
          </label>
          <p className="text-gray-900">{project.contact_person || "未設定"}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Mail size={16} className="inline mr-2" />
            メールアドレス
          </label>
          <p className="text-gray-900">{project.email || "未設定"}</p>
        </div>
      </div>
    </div>
  );
}



