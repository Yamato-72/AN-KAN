"use client";

export function CollectionRateTable({ data = [], currentUserId }) {
  const safeData = Array.isArray(data) ? data : [];

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h2 className="text-sm font-semibold mb-3">今月の回収率</h2>

      {safeData.length === 0 ? (
        <p className="text-sm text-gray-500">表示できるデータがありません。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-2 px-2 font-semibold text-gray-600">
                  営業
                </th>
                <th className="text-right py-2 px-2 font-semibold text-gray-600">
                  見積額
                </th>
                <th className="text-right py-2 px-2 font-semibold text-gray-600">
                  売上額
                </th>
                <th className="text-right py-2 px-2 font-semibold text-gray-600">
                  回収率
                </th>
              </tr>
            </thead>
            <tbody>
              {safeData.map((item) => {
                const estimated = Number(item.estimated || 0);
                const revenue = Number(item.revenue || 0);
                const rate =
                  estimated > 0 ? ((revenue / estimated) * 100).toFixed(1) : "-";

                const isCurrent =
                  String(item.userId) === String(currentUserId) ||
                  String(item.code) === String(currentUserId);

                return (
                  <tr
                    key={item.userId || item.code || item.name}
                    className={`border-b last:border-b-0 ${
                      isCurrent ? "bg-blue-50" : ""
                    }`}
                  >
                    <td
                      className={`py-2 px-2 ${
                        isCurrent ? "font-bold text-gray-900" : "text-gray-700"
                      }`}
                    >
                      {item.name}
                      {isCurrent ? "（自分）" : ""}
                    </td>
                    <td className="py-2 px-2 text-right text-gray-700">
                      {formatYen(estimated)}
                    </td>
                    <td className="py-2 px-2 text-right text-gray-700">
                      {formatYen(revenue)}
                    </td>
                    <td className="py-2 px-2 text-right font-semibold text-gray-900">
                      {rate === "-" ? "-" : `${rate}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatYen(value) {
  return Number(value || 0).toLocaleString("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  });
}