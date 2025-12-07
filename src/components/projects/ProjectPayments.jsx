"use client";

import { useState, useEffect } from "react";
import { formatCurrency, formatDate } from "@/utils/dateFormatters";

export function ProjectPayments({ projectId }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    amount: "",
    payment_date: "",
    description: "",
    payment_type: "支払い",
    created_by: "システム",
  });

  const paymentTypes = [
    "支払い",
    "前金",
    "残金",
    "海外送金",
    "材料費",
    "工事費",
    "その他",
  ];

  // 支払いログの取得
  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/payments`);
      if (!response.ok) {
        throw new Error(
          `支払いログの取得に失敗しました: ${response.statusText}`,
        );
      }
      const data = await response.json();
      setPayments(data);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching payments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [projectId]);

  // フォームリセット
  const resetForm = () => {
    setFormData({
      title: "",
      amount: "",
      payment_date: "",
      description: "",
      payment_type: "支払い",
      created_by: "システム",
    });
    setEditingPayment(null);
    setShowAddForm(false);
  };

  // 支払いログの作成・更新
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.amount) {
      alert("タイトルと金額は必須です");
      return;
    }

    try {
      const url = editingPayment
        ? `/api/projects/${projectId}/payments/${editingPayment.id}`
        : `/api/projects/${projectId}/payments`;

      const method = editingPayment ? "PUT" : "POST";
      const body = editingPayment
        ? { ...formData, updated_by: formData.created_by }
        : formData;

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "支払いログの保存に失敗しました");
      }

      await fetchPayments();
      resetForm();
      alert(
        editingPayment
          ? "支払いログを更新しました"
          : "支払いログを追加しました",
      );
    } catch (err) {
      alert(`エラー: ${err.message}`);
      console.error("Error saving payment:", err);
    }
  };

  // 編集開始
  const handleEdit = (payment) => {
    setFormData({
      title: payment.title,
      amount: payment.amount.toString(),
      payment_date: payment.payment_date,
      description: payment.description || "",
      payment_type: payment.payment_type,
      created_by: payment.created_by || "システム",
    });
    setEditingPayment(payment);
    setShowAddForm(true);
  };

  // 支払いログの削除
  const handleDelete = async (paymentId, paymentTitle) => {
    if (!confirm(`支払いログ「${paymentTitle}」を削除しますか？`)) {
      return;
    }

    try {
      const response = await fetch(
        `/api/projects/${projectId}/payments/${paymentId}?deleted_by=${encodeURIComponent(
          "システム",
        )}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "支払いログの削除に失敗しました");
      }

      await fetchPayments();
      alert("支払いログを削除しました");
    } catch (err) {
      alert(`エラー: ${err.message}`);
      console.error("Error deleting payment:", err);
    }
  };

  // 合計金額の計算
  const totalAmount = payments.reduce(
    (sum, payment) => sum + Number(payment.amount),
    0,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-lg text-gray-600">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">支払いログ</h3>
          <p className="text-sm text-gray-600">
            プロジェクトに関連する支払いを管理します
          </p>
          {payments.length > 0 && (
            <p className="text-sm font-medium text-blue-600 mt-1">
              合計支払い額: {formatCurrency(totalAmount)}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          {showAddForm ? "キャンセル" : "支払いを追加"}
        </button>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* 支払い追加/編集フォーム */}
      {showAddForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">
            {editingPayment ? "支払いログを編集" : "新しい支払いログを追加"}
          </h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  タイトル *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="支払いの内容を入力"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  金額 *
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                  step="1"
                  min="0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  支払い日
                </label>
                <input
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) =>
                    setFormData({ ...formData, payment_date: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  支払い種別
                </label>
                <select
                  value={formData.payment_type}
                  onChange={(e) =>
                    setFormData({ ...formData, payment_type: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {paymentTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                説明
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="支払いの詳細を記録してください"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                {editingPayment ? "更新" : "追加"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 支払い一覧 */}
      {payments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          まだ支払いログがありません
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-lg font-medium text-gray-900">
                      {payment.title}
                    </h4>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {payment.payment_type}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-green-600 mb-2">
                    {formatCurrency(payment.amount)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    <span>支払い日: {formatDate(payment.payment_date)}</span>
                    <span>作成日: {formatDate(payment.created_at)}</span>
                    {payment.created_by && (
                      <span>作成者: {payment.created_by}</span>
                    )}
                  </div>
                  {payment.description && (
                    <p className="text-gray-700 bg-gray-50 p-3 rounded-md">
                      {payment.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(payment)}
                    className="text-blue-600 hover:text-blue-800 px-3 py-1 text-sm font-medium"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete(payment.id, payment.title)}
                    className="text-red-600 hover:text-red-800 px-3 py-1 text-sm font-medium"
                  >
                    削除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}



