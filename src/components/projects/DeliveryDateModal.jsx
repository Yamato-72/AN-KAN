import { useState, useEffect } from "react";
import { X } from "lucide-react";

export const DeliveryDateModal = ({ show, onConfirm, onCancel, project }) => {
  const [deliveryDate, setDeliveryDate] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (show && project) {
      // 既存の納期がある場合は初期値として設定
      const existingDate = project.delivery_date
        ? new Date(project.delivery_date).toISOString().split("T")[0]
        : "";
      setDeliveryDate(existingDate);
      setError("");
    }
  }, [show, project]);

  if (!show) return null;

  const handleConfirm = () => {
    if (!deliveryDate || deliveryDate.trim() === "") {
      setError("納期は必須入力です");
      return;
    }

    setError("");
    onConfirm(deliveryDate);
  };

  const handleClose = () => {
    setDeliveryDate("");
    setError("");
    onCancel();
  };

  const isFormValid = deliveryDate.trim() !== "";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-700">
            納期設定・受注確定
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-4">
              受注を確定する前に納期を設定してください。
            </p>

            <label className="block text-sm font-medium text-gray-700 mb-2">
              納期 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={deliveryDate}
              onChange={(e) => {
                setDeliveryDate(e.target.value);
                if (error) setError("");
              }}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                error ? "border-red-300 bg-red-50" : "border-gray-300"
              }`}
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              キャンセル
            </button>
            <button
              onClick={handleConfirm}
              disabled={!isFormValid}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                isFormValid
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              受注を確定する
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};



