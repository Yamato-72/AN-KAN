export const getStatusColor = (status) => {
  const colors = {
    打ち合わせ中: "bg-yellow-100 text-yellow-800 border-yellow-200",
    受注済み: "bg-blue-100 text-blue-800 border-blue-200",
    国際発注済: "bg-purple-100 text-purple-800 border-purple-200",
    設置手配済: "bg-orange-100 text-orange-800 border-orange-200",
    設置完了: "bg-green-100 text-green-800 border-green-200",
    残金請求済: "bg-gray-100 text-gray-800 border-gray-200",
  };
  return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
};



