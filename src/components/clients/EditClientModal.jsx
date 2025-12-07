import { useState, useEffect } from "react";
import { X } from "lucide-react";

const INITIAL_FORM_DATA = {
  client_name: "",
  company_address: "",
  phone_number: "",
  contact_person: "",
  email: "",
};

export const EditClientModal = ({
  show,
  onClose,
  onSuccess,
  client = null,
}) => {
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [formError, setFormError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // モーダルが開かれたときにフォームデータを設定
  useEffect(() => {
    if (show && client) {
      setFormData({
        client_name: client.client_name || "",
        company_address: client.company_address || "",
        phone_number: client.phone_number || "",
        contact_person: client.contact_person || "",
        email: client.email || "",
      });
    }
  }, [show, client]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleClose = () => {
    onClose();
    setFormError("");
    setFormData(INITIAL_FORM_DATA);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.client_name) {
      setFormError("クライアント名は必須です");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/clients/${client.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "クライアントの更新に失敗しました");
      }

      onClose();
      setFormData(INITIAL_FORM_DATA);
      setFormError("");
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      setFormError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 lg:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg lg:text-xl font-semibold text-gray-700">
            クライアント編集
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {formError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {formError}
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              クライアント名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.client_name}
              onChange={(e) => handleInputChange("client_name", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="クライアント名を入力"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              担当者名
            </label>
            <input
              type="text"
              value={formData.contact_person}
              onChange={(e) =>
                handleInputChange("contact_person", e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="担当者名を入力"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              電話番号
            </label>
            <input
              type="tel"
              value={formData.phone_number}
              onChange={(e) =>
                handleInputChange("phone_number", e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="例: 03-1234-5678"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              メールアドレス
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="例: contact@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              会社住所
            </label>
            <textarea
              value={formData.company_address}
              onChange={(e) =>
                handleInputChange("company_address", e.target.value)
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize"
              placeholder="会社住所を入力"
            />
            <p className="text-xs text-gray-500 mt-1">
              テキストエリアの右下をドラッグしてサイズを変更できます
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "更新中..." : "更新"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};



