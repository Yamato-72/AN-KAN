import { useState, useEffect } from "react";
import { X } from "lucide-react";

export const InstallationInfoModal = ({
  show,
  onConfirm,
  onCancel,
  initialContractor = "",
  initialDate = "",
}) => {
  const [contractor, setContractor] = useState(initialContractor);
  const [date, setDate] = useState(initialDate);
  const [errors, setErrors] = useState({});

  // 設置業者候補機能
  const [contractors, setContractors] = useState([]);
  const [showContractorSuggestions, setShowContractorSuggestions] =
    useState(false);
  const [filteredContractors, setFilteredContractors] = useState([]);

  // 設置業者一覧を取得
  const fetchContractors = async () => {
    try {
      const response = await fetch("/api/contractors");
      if (response.ok) {
        const data = await response.json();
        setContractors(data);
      }
    } catch (error) {
      console.error("設置業者一覧の取得に失敗:", error);
    }
  };

  // 設置業者入力時のフィルタリング
  useEffect(() => {
    if (!contractor) {
      setFilteredContractors([]);
      setShowContractorSuggestions(false);
      return;
    }

    const query = contractor.toLowerCase();
    const filtered = contractors.filter((contractorItem) =>
      contractorItem.contractor_name.toLowerCase().includes(query),
    );
    setFilteredContractors(filtered);
    setShowContractorSuggestions(filtered.length > 0 && contractor !== "");
  }, [contractor, contractors]);

  useEffect(() => {
    if (show) {
      setContractor(initialContractor);
      setDate(initialDate);
      setErrors({});
      // 設置業者一覧を取得
      fetchContractors();
    }
  }, [show, initialContractor, initialDate]);

  // 設置業者選択時の処理
  const handleContractorSelect = (contractorItem) => {
    setContractor(contractorItem.contractor_name);
    setShowContractorSuggestions(false);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!contractor.trim()) {
      newErrors.contractor = "設置業者は必須入力です";
    }

    if (!date) {
      newErrors.date = "設置日は必須入力です";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const submitData = {
      installation_contractor: contractor.trim(),
      installation_date: date,
    };

    onConfirm(submitData);
  };

  const handleClose = () => {
    setContractor(initialContractor);
    setDate(initialDate);
    setErrors({});
    setShowContractorSuggestions(false);
    onCancel();
  };

  if (!show) {
    return null;
  }

  const isFormValid = contractor.trim() && date;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-700">
            設置情報を入力してください
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              設置業者 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={contractor}
              onChange={(e) => {
                setContractor(e.target.value);
                if (errors.contractor && e.target.value.trim()) {
                  setErrors((prev) => ({ ...prev, contractor: undefined }));
                }
              }}
              onFocus={() =>
                contractor &&
                setShowContractorSuggestions(filteredContractors.length > 0)
              }
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
                errors.contractor ? "border-red-300" : "border-gray-300"
              }`}
              placeholder="設置業者名を入力"
            />
            {showContractorSuggestions && filteredContractors.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto mt-1">
                {filteredContractors.map((contractorItem) => (
                  <button
                    key={contractorItem.id}
                    type="button"
                    onClick={() => handleContractorSelect(contractorItem)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium text-gray-900">
                      {contractorItem.contractor_name}
                    </div>
                    {contractorItem.contact_person && (
                      <div className="text-sm text-gray-600">
                        {contractorItem.contact_person}
                      </div>
                    )}
                    {contractorItem.phone_number && (
                      <div className="text-xs text-gray-500">
                        {contractorItem.phone_number}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
            {errors.contractor && (
              <p className="mt-1 text-sm text-red-600">{errors.contractor}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              設置日 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                if (errors.date && e.target.value) {
                  setErrors((prev) => ({ ...prev, date: undefined }));
                }
              }}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
                errors.date ? "border-red-300" : "border-gray-300"
              }`}
            />
            {errors.date && (
              <p className="mt-1 text-sm text-red-600">{errors.date}</p>
            )}
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
              disabled={!isFormValid}
              className={`flex-1 px-4 py-2 rounded-lg font-medium ${
                isFormValid
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              ステータスを更新する
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};



