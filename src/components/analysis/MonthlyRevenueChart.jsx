"use client";

import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  Label,
} from "recharts";

const formatYenShort = (value) => {
  const man = value / 10000;
  return `${man.toFixed(0)}万`;
};

export const MonthlyRevenueChart = ({ data }) => {
  if (!data || data.length === 0) {
    return <p className="text-sm text-gray-500">データがありません。</p>;
  }

  return (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />

          {/* ← 上に余裕を持たせる */}
          <YAxis
            tickFormatter={formatYenShort}
            tick={{ fontSize: 11, fill: "#444" }}
            width={40}
            domain={[0, (dataMax) => dataMax * 1.2]} // ★ここ！
          >
            <Label
              value="金額（万円）"
              angle={-90}
              position="insideLeft"
              style={{ textAnchor: "middle", fontSize: 11 }}
            />
          </YAxis>

          <Tooltip
            formatter={(value) =>
              value.toLocaleString("ja-JP", {
                style: "currency",
                currency: "JPY",
                maximumFractionDigits: 0,
              })
            }
          />
          <Legend />

          <Bar dataKey="estimated" name="見積合計" fill="#4F46E5" />
          <Bar dataKey="revenue" name="売上合計" fill="#10B981" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
