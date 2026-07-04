"use client";

import { useEffect, useState } from "react";

// ============================================================
// 今期売上の細い帯（ヘッダー直下・全ページ共通）
//   - /api/sales-progress を読んで、12ヶ月セグメントで進捗を表示
//   - 取得に失敗したときは何も出さない（画面を邪魔しない）
// ============================================================

// 金額の短縮表示（¥2.7億 / ¥1,250万 / ¥3,500）
function shortYen(n) {
  const v = Math.round(n);
  const abs = Math.abs(v);
  if (abs >= 100000000) {
    const oku = v / 100000000;
    return `¥${(Math.round(oku * 10) / 10).toLocaleString()}億`;
  }
  if (abs >= 10000) return `¥${Math.round(v / 10000).toLocaleString()}万`;
  return `¥${v.toLocaleString()}`;
}

export const SalesProgressBand = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/sales-progress")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d && !d.error) setData(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!data) return null;

  const frac = Math.min(data.total / data.target, 1) * 12;
  const now = new Date();
  const nowIdx = (now.getMonth() + 6) % 12; // 7月=0
  const ahead = data.diff >= 0;

  return (
    <div className="flex items-center gap-3 px-4 lg:pl-20 py-1.5 bg-white border-b border-gray-100">
      <span className="text-[11px] font-semibold text-gray-500 whitespace-nowrap">
        第{data.periodNo}期売上
      </span>
      <div className="flex-1 grid grid-cols-12 gap-[3px] min-w-[120px]">
        {Array.from({ length: 12 }).map((_, i) => {
          const w = Math.max(0, Math.min(1, frac - i)) * 100;
          return (
            <div
              key={i}
              className={`h-1.5 rounded-sm bg-gray-200 overflow-hidden ${
                i === nowIdx ? "ring-1 ring-gray-400" : ""
              }`}
            >
              <div
                className="h-full bg-[#D6001C]"
                style={{ width: `${w}%` }}
              />
            </div>
          );
        })}
      </div>
      <span className="text-[11px] text-gray-700 whitespace-nowrap tabular-nums">
        {shortYen(data.total)}
        <span className="text-gray-400"> / {shortYen(data.target)}</span>
        <span
          className={`ml-2 font-semibold ${ahead ? "text-emerald-600" : "text-amber-600"}`}
        >
          {ahead ? "+" : ""}
          {shortYen(data.diff)}
        </span>
        {data.marginPct !== null && data.marginPct !== undefined && (
          <span className="ml-3 hidden sm:inline">
            粗利{" "}
            <span
              className={`font-semibold ${
                data.marginPct >= (data.targetMargin || 48)
                  ? "text-emerald-600"
                  : "text-amber-600"
              }`}
            >
              {data.marginPct.toFixed(1)}%
            </span>
            <span className="text-gray-400">/{data.targetMargin || 48}%</span>
          </span>
        )}
      </span>
    </div>
  );
};
