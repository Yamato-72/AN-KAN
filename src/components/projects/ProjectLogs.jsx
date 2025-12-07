import { useState, useEffect } from "react";
import {
  Plus,
  Calendar,
  User,
  Edit,
  Trash2,
  X,
  Save,
  FileText,
  MessageSquare,
} from "lucide-react";

export const ProjectLogs = ({ projectId }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false); // 送信中状態を追加
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    log_date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchLogs();
  }, [projectId]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/logs`);
      if (!response.ok) {
        throw new Error("ログの取得に失敗しました");
      }
      const data = await response.json();
      setLogs(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 二重送信防止
    if (submitting) {
      return;
    }

    if (!formData.title.trim() || !formData.content.trim()) {
      alert("タイトルと内容を入力してください");
      return;
    }

    try {
      setSubmitting(true); // 送信開始

      const url = editingLog
        ? `/api/projects/${projectId}/logs/${editingLog.id}`
        : `/api/projects/${projectId}/logs`;

      const method = editingLog ? "PUT" : "POST";

      // 担当者情報を取得
      const selectedStaff = localStorage.getItem("selectedStaff");
      let createdBy = "未知のユーザー";
      if (selectedStaff) {
        try {
          const staff = JSON.parse(selectedStaff);
          createdBy = staff.name;
        } catch (error) {
          console.error("担当者情報の取得に失敗しました:", error);
        }
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          created_by: editingLog ? undefined : createdBy,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "ログの保存に失敗しました");
      }

      setShowAddModal(false);
      setEditingLog(null);
      setFormData({
        title: "",
        content: "",
        log_date: new Date().toISOString().split("T")[0],
      });
      await fetchLogs(); // 成功したらログ一覧を再取得
    } catch (err) {
      alert(`エラー: ${err.message}`);
    } finally {
      setSubmitting(false); // 送信終了
    }
  };

  const handleEdit = (log) => {
    setEditingLog(log);
    setFormData({
      title: log.title,
      content: log.content,
      log_date: log.log_date,
    });
    setShowAddModal(true);
  };

  const handleDelete = async (logId, title) => {
    if (!confirm(`「${title}」を削除しますか？`)) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/logs/${logId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "ログの削除に失敗しました");
      }

      fetchLogs();
    } catch (err) {
      alert(`エラー: ${err.message}`);
    }
  };

  const resetForm = () => {
    setEditingLog(null);
    setFormData({
      title: "",
      content: "",
      log_date: new Date().toISOString().split("T")[0],
    });
    setShowAddModal(false);
    setSubmitting(false); // リセット時に送信状態もリセット
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">商談ログ</h2>
        </div>
        <div className="px-6 py-8 text-center text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">商談ログ</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-colors"
          >
            <Plus size={16} />
            <span>ログ追加</span>
          </button>
        </div>

        {error ? (
          <div className="px-6 py-8 text-center text-red-500">
            エラー: {error}
          </div>
        ) : logs.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            <MessageSquare size={48} className="mx-auto mb-4 text-gray-300" />
            <p>まだログがありません</p>
            <p className="text-sm mt-2">商談や打ち合わせの記録を残しましょう</p>
          </div>
        ) : (
          <div className="px-6 py-4 space-y-4">
            {logs.map((log) => (
              <div
                key={log.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-medium text-gray-900 mb-1 break-words">
                      {log.title}
                    </h3>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Calendar size={12} />
                        <span>{formatDate(log.log_date)}</span>
                      </div>
                      {log.created_by && (
                        <div className="flex items-center space-x-1">
                          <User size={12} />
                          <span>{log.created_by}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-1">
                        <FileText size={12} />
                        <span>作成: {formatDateTime(log.created_at)}</span>
                      </div>
                      {log.updated_at !== log.created_at && (
                        <div className="flex items-center space-x-1">
                          <Edit size={12} />
                          <span>更新: {formatDateTime(log.updated_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleEdit(log)}
                      className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                      title="編集"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(log.id, log.title)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="削除"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed break-words overflow-wrap-anywhere">
                  {log.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 追加・編集モーダル */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingLog ? "ログ編集" : "ログ追加"}
              </h3>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  タイトル <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="例: 初回打ち合わせ、仕様確認など"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  日付 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.log_date}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      log_date: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  内容 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      content: e.target.value,
                    }))
                  }
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-vertical"
                  placeholder="商談内容、決定事項、次回の予定などを記録してください"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={submitting} // 送信中は無効化
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed font-medium flex items-center justify-center space-x-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>{editingLog ? "更新中..." : "保存中..."}</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>{editingLog ? "更新" : "保存"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};



