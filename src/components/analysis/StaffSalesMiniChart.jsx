"use client";

export function StaffSalesMiniChart({ data = [], currentUserId }) {
  const safeData = Array.isArray(data) ? data : [];
  const maxRevenue = Math.max(...safeData.map((item) => item.revenue || 0), 0);

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h2 className="text-sm font-semibold mb-3">今月の営業別売上</h2>

      {safeData.length === 0 ? (
        <p className="text-sm text-gray-500">表示できるデータがありません。</p>
      ) : (
        <div className="space-y-3">
          {safeData.map((item) => {
            const revenue = Number(item.revenue || 0);
            const percent =
              maxRevenue > 0 ? Math.max((revenue / maxRevenue) * 100, 6) : 0;

            const isCurrent =
              String(item.userId) === String(currentUserId) ||
              String(item.code) === String(currentUserId);

            return (
              <div key={item.userId || item.code || item.name}>
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-sm ${
                      isCurrent ? "font-bold text-gray-900" : "text-gray-700"
                    }`}
                  >
                    {item.name}
                    {isCurrent ? "（自分）" : ""}
                  </span>
                  <span
                    className={`text-xs ${
                      isCurrent ? "font-semibold text-gray-900" : "text-gray-500"
                    }`}
                  >
                    {formatYen(revenue)}
                  </span>
                </div>

                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isCurrent ? "bg-blue-500" : "bg-gray-300"
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
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