export const formatDate = (dateString) => {
  if (!dateString) return "未設定";
  return new Date(dateString).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export const formatDateTime = (dateString) => {
  if (!dateString) return "未設定";
  return new Date(dateString).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return "¥0";
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
  }).format(amount);
};



