"use client";
import { useStockSummary, STOCK_STAGES } from "@/lib/stockSummary";

// 一覧の表用：数がある段だけ1行で
export function StockStateText({ project }) {
  const m = useStockSummary(project.prefix, project.ad_number);
  if (!m || !m.total) return null;
  if (m.shipped === m.total) return <div className="text-[11px] text-gray-500 mt-1">全{m.total}台 出荷済み</div>;
  return (
    <div className="text-[11px] text-gray-500 mt-1 whitespace-normal leading-snug">
      {STOCK_STAGES.filter(([k]) => m[k] > 0).map(([k, l]) => `${l} ${m[k]}`).join("・")}
    </div>
  );
}

// 案件ページ用：物の流れを左から右へ。今いる段に数が出る
export function StockStateFlow({ project }) {
  const m = useStockSummary(project.prefix, project.ad_number);
  if (!m || !m.total) return null;
  return (
    <div className="mb-6 bg-white border border-gray-200 rounded-xl px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-500">物の状態（在庫ナビ・支払ナビから自動）</p>
        <p className="text-xs text-gray-400">全{m.total}台</p>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {STOCK_STAGES.map(([k, label]) => {
          const n = m[k] || 0;
          return (
            <div
              key={k}
              className={`rounded-lg px-2 py-2 text-center border ${
                n ? (k === "waiting" ? "bg-gray-900 text-white border-gray-900" : "bg-gray-100 text-gray-900 border-gray-200") : "bg-white text-gray-300 border-gray-100"
              }`}
            >
              <div className="text-lg font-bold tabular-nums leading-none">{n}</div>
              <div className="text-[11px] mt-1 whitespace-nowrap">{label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
