import { useState, useEffect } from "react";
import { X, ChevronDown } from "lucide-react";
import { useCreateProject } from "@/hooks/useCreateProject";

// 2か月後の日付を取得する関数
const getTwoMonthsLater = () => {
  const today = new Date();
  const twoMonthsLater = new Date(today);
  twoMonthsLater.setMonth(today.getMonth() + 2);
  return twoMonthsLater.toISOString().split("T")[0]; // YYYY-MM-DD形式
};

const INITIAL_FORM_DATA = {
  ad_number: "",
  project_name: "",
  client_name: "",
  inquiry_date: "", // 問い合わせ日を追加
  remarks: "",
  product_number: "", // 製品番号を追加
  installation_date: "",
  installation_contractor: "",
  delivery_date: "", // 初期値を空に変更
  assigned_team_member: null, // 担当者ID
  estimated_amount: "", // 見積額
  address: "", // 住所
  phone_number: "", // 電話番号
  company_address: "", // 会社住所
  contact_person: "", // 担当者名
  email: "", // メールアドレス
  installation_cost: "", // 設置費用
};

export const NewProjectModal = ({
  show,
  onClose,
  onSuccess,
  editProject = null,
  currentUserId = null, // 新しいプロパティを追加
}) => {
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [formError, setFormError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoadingAdNumber, setIsLoadingAdNumber] = useState(false);

  // クライアント候補機能
  const [clients, setClients] = useState([]);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [filteredClients, setFilteredClients] = useState([]);

  // 設置業者候補機能
  const [contractors, setContractors] = useState([]);
  const [showContractorSuggestions, setShowContractorSuggestions] =
    useState(false);
  const [filteredContractors, setFilteredContractors] = useState([]);

  // 編集モードかどうかを判定
  useEffect(() => {
    setIsEditing(editProject !== null);
  }, [editProject]);

  // クライアント一覧を取得
  const fetchClients = async () => {
    try {
      const response = await fetch("/api/clients");
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (error) {
      console.error("クライアント一覧の取得に失敗:", error);
    }
  };

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

  // クライアント名入力時のフィルタリング
  useEffect(() => {
    if (!formData.client_name) {
      setFilteredClients([]);
      setShowClientSuggestions(false);
      return;
    }

    const query = formData.client_name.toLowerCase();
    const filtered = clients.filter((client) =>
      client.client_name.toLowerCase().includes(query),
    );
    setFilteredClients(filtered);
    setShowClientSuggestions(
      filtered.length > 0 && formData.client_name !== "",
    );
  }, [formData.client_name, clients]);

  // 設置業者入力時のフィルタリング
  useEffect(() => {
    if (!formData.installation_contractor) {
      setFilteredContractors([]);
      setShowContractorSuggestions(false);
      return;
    }

    const query = formData.installation_contractor.toLowerCase();
    const filtered = contractors.filter((contractor) =>
      contractor.contractor_name.toLowerCase().includes(query),
    );
    setFilteredContractors(filtered);
    setShowContractorSuggestions(
      filtered.length > 0 && formData.installation_contractor !== "",
    );
  }, [formData.installation_contractor, contractors]);

  // 次のAD番号を取得する関数
  const fetchNextAdNumber = async () => {
    try {
      setIsLoadingAdNumber(true);
      const response = await fetch("/api/projects/next-ad-number");
      if (!response.ok) {
        throw new Error("AD番号の取得に失敗しました");
      }
      const data = await response.json();
      return data.nextAdNumber;
    } catch (error) {
      console.error("AD番号の取得エラー:", error);
      return "";
    } finally {
      setIsLoadingAdNumber(false);
    }
  };

  // モーダルが開かれたときにフォームデータを設定
  useEffect(() => {
    if (show) {
      // クライアント一覧を取得
      fetchClients();
      // 設置業者一覧を取得
      fetchContractors();

      if (editProject) {
        // 編集モード：既存データを設定
        setFormData({
          ad_number: editProject.ad_number || "",
          project_name: editProject.project_name || "",
          client_name: editProject.client_name || "",
          inquiry_date: editProject.inquiry_date
            ? new Date(editProject.inquiry_date).toISOString().split("T")[0]
            : "",
          remarks: editProject.remarks || "",
          product_number: editProject.product_number || "", // 製品番号を追加
          installation_date: editProject.installation_date
            ? new Date(editProject.installation_date)
                .toISOString()
                .split("T")[0]
            : "",
          installation_contractor: editProject.installation_contractor || "",
          delivery_date: editProject.delivery_date
            ? new Date(editProject.delivery_date).toISOString().split("T")[0]
            : "",
          assigned_team_member:
            editProject.assigned_team_member_id ||
            editProject.assigned_team_member,
          estimated_amount: editProject.estimated_amount || "",
          address: editProject.address || "",
          phone_number: editProject.phone_number || "",
          company_address: editProject.company_address || "",
          contact_person: editProject.contact_person || "",
          email: editProject.email || "",
          installation_cost: editProject.installation_cost || "",
        });
      } else {
        // 新規作成モード：担当者情報と次のAD番号を取得
        const initializeForm = async () => {
          const nextAdNumber = await fetchNextAdNumber();

          let assignedTeamMember = null;

          // currentUserIdが指定されている場合は、そのユーザーを担当者として設定
          if (currentUserId) {
            try {
              const response = await fetch("/api/staff");
              if (response.ok) {
                const staffData = await response.json();
                // userIdに対応するスタッフを検索（codeまたはidで）
                const staff = staffData.find(
                  (s) =>
                    s.code === currentUserId ||
                    s.id.toString() === currentUserId,
                );
                if (staff) {
                  assignedTeamMember = staff.code; // codeを使用
                  console.log(
                    `担当者を現在のユーザーに設定: ${staff.name} (${staff.code})`,
                  );
                } else {
                  console.warn(
                    `現在のユーザー ${currentUserId} が見つかりません`,
                  );
                }
              }
            } catch (error) {
              console.error("スタッフ情報の取得に失敗:", error);
            }
          }

          // currentUserIdが指定されていない場合のみlocalStorageをフォールバック
          if (!assignedTeamMember) {
            const selectedStaff = localStorage.getItem("selectedStaff");
            if (selectedStaff) {
              try {
                const staff = JSON.parse(selectedStaff);
                assignedTeamMember = staff.code; // idではなくcodeを使用
                console.log(
                  `フォールバック: localStorage担当者 ${staff.name} (${staff.code})`,
                );
              } catch (error) {
                console.error("担当者情報の取得に失敗しました:", error);
              }
            }
          }

          setFormData((prev) => ({
            ...prev,
            ad_number: nextAdNumber.toString(),
            assigned_team_member: assignedTeamMember,
            delivery_date: "", // 空文字列に変更
          }));
        };

        initializeForm();
      }
    }
  }, [show, editProject, currentUserId]); // currentUserIdを依存配列に追加

  const createProjectMutation = useCreateProject({
    onSuccess: () => {
      onClose();
      setFormData(INITIAL_FORM_DATA);
      setFormError("");
      // Call the onSuccess callback to refetch data
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      setFormError(error.message);
    },
  });

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // クライアント選択時の処理
  const handleClientSelect = (client) => {
    setFormData((prev) => ({
      ...prev,
      client_name: client.client_name,
      contact_person: client.contact_person || "",
      email: client.email || "",
      phone_number: client.phone_number || "",
      company_address: client.company_address || "",
    }));
    setShowClientSuggestions(false);
  };

  // 設置業者選択時の処理
  const handleContractorSelect = (contractor) => {
    setFormData((prev) => ({
      ...prev,
      installation_contractor: contractor.contractor_name,
    }));
    setShowContractorSuggestions(false);
  };

  const handleClose = () => {
    onClose();
    setFormError("");
    setFormData(INITIAL_FORM_DATA);
    setShowClientSuggestions(false);
    setShowContractorSuggestions(false);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (
      !formData.ad_number ||
      !formData.client_name ||
      !formData.inquiry_date
    ) {
      setFormError("AD番号、取引先名、問い合わせ日は必須です");
      return;
    }

    // プロジェクト名が空の場合は「無題」を設定
    const submitData = {
      ...formData,
      project_name: formData.project_name.trim() || "無題",
    };

    if (isEditing) {
      // 編集モード
      try {
        const response = await fetch(`/api/projects/${editProject.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(submitData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "プロジェクトの更新に失敗しました",
          );
        }

        onClose();
        setFormData(INITIAL_FORM_DATA);
        setFormError("");
        if (onSuccess) {
          onSuccess();
        }
      } catch (error) {
        setFormError(error.message);
      }
    } else {
      // 新規作成モード
      createProjectMutation.mutate(submitData);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 lg:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg lg:text-xl font-semibold text-gray-700">
            {isEditing ? "プロジェクト編集" : "新規プロジェクト登録"}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AD番号 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.ad_number}
                onChange={(e) => handleInputChange("ad_number", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="例: 12345"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                表示時は「AD-12345」となります
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                プロジェクト名
              </label>
              <input
                type="text"
                value={formData.project_name}
                onChange={(e) =>
                  handleInputChange("project_name", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="プロジェクト名を入力（空の場合は「無題」になります）"
              />
            </div>
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              取引先名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.client_name}
              onChange={(e) => handleInputChange("client_name", e.target.value)}
              onFocus={() =>
                formData.client_name &&
                setShowClientSuggestions(filteredClients.length > 0)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="取引先名を入力"
              required
            />
            {showClientSuggestions && filteredClients.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto mt-1">
                {filteredClients.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => handleClientSelect(client)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium text-gray-900">
                      {client.client_name}
                    </div>
                    {client.contact_person && (
                      <div className="text-sm text-gray-600">
                        {client.contact_person}
                      </div>
                    )}
                    {client.phone_number && (
                      <div className="text-xs text-gray-500">
                        {client.phone_number}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              問い合わせ日 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.inquiry_date}
              onChange={(e) =>
                handleInputChange("inquiry_date", e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                設置先住所
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="設置先住所を入力"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                会社住所
              </label>
              <input
                type="text"
                value={formData.company_address}
                onChange={(e) =>
                  handleInputChange("company_address", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="会社住所を入力"
              />
            </div>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              製品番号
            </label>
            <textarea
              value={formData.product_number}
              onChange={(e) =>
                handleInputChange("product_number", e.target.value)
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize"
              placeholder="製品番号、型番、仕様などを自由に入力してください"
            />
            <p className="text-xs text-gray-500 mt-1">
              製品の型番や仕様を自由な形式で入力できます
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              備考
            </label>
            <textarea
              value={formData.remarks}
              onChange={(e) => handleInputChange("remarks", e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize"
              placeholder="備考があれば入力してください"
            />
            <p className="text-xs text-gray-500 mt-1">
              テキストエリアの右下をドラッグしてサイズを変更できます
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                設置日
              </label>
              <input
                type="date"
                value={formData.installation_date}
                onChange={(e) =>
                  handleInputChange("installation_date", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                設置業者
              </label>
              <input
                type="text"
                value={formData.installation_contractor}
                onChange={(e) =>
                  handleInputChange("installation_contractor", e.target.value)
                }
                onFocus={() =>
                  formData.installation_contractor &&
                  setShowContractorSuggestions(filteredContractors.length > 0)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="設置業者名を入力"
              />
              {showContractorSuggestions && filteredContractors.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto mt-1">
                  {filteredContractors.map((contractor) => (
                    <button
                      key={contractor.id}
                      type="button"
                      onClick={() => handleContractorSelect(contractor)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900">
                        {contractor.contractor_name}
                      </div>
                      {contractor.contact_person && (
                        <div className="text-sm text-gray-600">
                          {contractor.contact_person}
                        </div>
                      )}
                      {contractor.phone_number && (
                        <div className="text-xs text-gray-500">
                          {contractor.phone_number}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              見積額
            </label>
            <div className="relative">
              <input
                type="number"
                value={formData.estimated_amount}
                onChange={(e) =>
                  handleInputChange("estimated_amount", e.target.value)
                }
                className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="1000000"
                min="0"
                step="1"
              />
              <span className="absolute right-3 top-2 text-gray-500 text-sm">
                円
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              数値のみ入力してください（例：1000000）
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              納期
            </label>
            <input
              type="date"
              value={formData.delivery_date}
              onChange={(e) =>
                handleInputChange("delivery_date", e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              設置費用
            </label>
            <div className="relative">
              <input
                type="number"
                value={formData.installation_cost}
                onChange={(e) =>
                  handleInputChange("installation_cost", e.target.value)
                }
                className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="500000"
                min="0"
                step="1"
              />
              <span className="absolute right-3 top-2 text-gray-500 text-sm">
                円
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              数値のみ入力してください（例：500000）
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
              disabled={createProjectMutation.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createProjectMutation.isPending
                ? isEditing
                  ? "更新中..."
                  : "登録中..."
                : isEditing
                  ? "更新"
                  : "登録"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

