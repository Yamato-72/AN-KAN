import { useState, useEffect } from "react";
import { X } from "lucide-react";

export const EditContractorModal = ({
  show,
  onClose,
  onSuccess,
  contractor = null,
}) => {
  const [formData, setFormData] = useState({
    contractor_name: "",
    company_address: "",
    phone_number: "",
    contact_person: "",
    email: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // モーダルが開かれた際の処理
  useEffect(() => {
    if (show) {
      if (contractor) {
        // 編集モード
        setFormData({
          contractor_name: contractor.contractor_name || "",
          company_address: contractor.company_address || "",
          phone_number: contractor.phone_number || "",
          contact_person: contractor.contact_person || "",
          email: contractor.email || "",
        });
      } else {
        // 新規作成モード
        setFormData({
          contractor_name: "",
          company_address: "",
          phone_number: "",
          contact_person: "",
          email: "",
        });
      }
      setError("");
    }
  }, [show, contractor]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // バリデーション
    if (!formData.contractor_name.trim()) {
      setError("業者名は必須です");
      return;
    }

    setIsSubmitting(true);

    try {
      let response;
      if (contractor) {
        // 更新
        response = await fetch(`/api/contractors/${contractor.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });
      } else {
        // 新規作成
        response = await fetch("/api/contractors", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "設置業者の保存に失敗しました");
      }

      // 成功時の処理
      onSuccess();
      onClose();
    } catch (error) {
      console.error("設置業者保存エラー:", error);
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setError("");
    onClose();
  };

  if (!show) return null;

  const isEditMode = !!contractor;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditMode ? "設置業者編集" : "新規設置業者登録"}
          </h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              業者名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.contractor_name}
              onChange={(e) =>
                handleInputChange("contractor_name", e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="設置業者名を入力"
              required
              disabled={isSubmitting}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-vertical"
              placeholder="会社住所を入力"
              disabled={isSubmitting}
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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
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
              placeholder="例: contractor@example.com"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? isEditMode
                  ? "更新中..."
                  : "登録中..."
                : isEditMode
                  ? "更新"
                  : "登録"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};



