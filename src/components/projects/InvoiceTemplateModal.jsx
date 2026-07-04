import { useState } from "react";
import { X, Copy, Check } from "lucide-react";
import { formatProjectNumber } from "@/lib/prefixes";
import {
  getTodayFormatted,
  getNextMonthEndDate,
} from "@/utils/invoiceTemplateGenerator";

export const InvoiceTemplateModal = ({
  show,
  onConfirm,
  onCancel,
  project,
}) => {
  const [copied, setCopied] = useState(false);

  if (!show) return null;

  // 請求先住所と担当者名を組み合わせる関数
  const getBillingAddress = () => {
    const address = project?.company_address || "";
    const contact = project?.contact_person || "";

    if (address && contact) {
      return `${address} ${contact}様`;
    } else if (address) {
      return address;
    } else if (contact) {
      return `${contact}様`;
    }
    return "";
  };

  // 自動日付設定
  const sendDate = getTodayFormatted();
  const paymentDueDate = getNextMonthEndDate();

  const invoiceTemplate = `案件番号：${formatProjectNumber(project?.prefix, project?.ad_number)}
顧客正式名：${project?.client_name || ""}
請求先住所、部署、担当者名（担当者名があれば）：${getBillingAddress()}
請求書送付希望日または発行希望日：${sendDate}
入金予定日：${paymentDueDate}
請求書送付方法（メール・郵送・PDF）：PDF
見積分番号（MF見積番号：`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(invoiceTemplate);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("コピーに失敗しました:", error);
    }
  };

  const handleConfirm = () => {
    onConfirm();
  };

  const handleClose = () => {
    setCopied(false);
    onCancel();
  };

  const isFormValid = true;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-700">
            請求書発行・売上登録
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* テンプレート表示 */}
          <div>
            <p className="text-sm text-gray-600 mb-3">
              下記のテンプレートをコピーしてご利用ください。
            </p>

            <div className="relative">
              <textarea
                value={invoiceTemplate}
                readOnly
                className="w-full h-48 p-3 border border-gray-300 rounded-lg font-mono text-sm bg-gray-50 resize-none"
              />
              <button
                onClick={handleCopy}
                className={`absolute top-3 right-3 flex items-center gap-1 px-3 py-1 rounded-md text-sm transition-all ${
                  copied
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    コピー済み
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    コピー
                  </>
                )}
              </button>
            </div>
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
              ステータスを更新する
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};



