"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { formatProjectNumber } from "@/lib/prefixes";
import { getStatusText } from "@/utils/status";
import { STAGES, isOrdered, man } from "@/lib/salesAnalytics";

// ============================================================
// 担当者の数字と案件一覧（右から出るパネル）
//   売上分析で名前を押したとき、ダッシュボードの「自分の今期」で「くわしく」を押したときに出す
//   projects はその人のその期の案件（prepareSales 済み）
// ============================================================
export function StaffSalesPanel({ name, projects, scopeLabel, scopedTotal, secretPath, onClose }) {
  const [staffSort, setStaffSort] = useState("rev"); // rev=売上順 / date=新しい順
  const staffProjects = useMemo(() => {
    const dateOf = (p) => p.sales_date || p.delivery_date || p.inquiry_date || p.created_at || "";
    return [...projects].sort((a, b) =>
      staffSort === "rev" ? b._rev - a._rev : String(dateOf(b)).localeCompare(String(dateOf(a))),
    );
  }, [projects, staffSort]);
  const staffTotal = staffProjects.reduce((a, p) => a + p._rev, 0);
  const staffOrdered = staffProjects.filter(isOrdered).length;
  const staffTs = staffProjects.filter((p) => p._stage === "トラブル対応");
  const staffSalesPaid = staffProjects.filter((p) => isOrdered(p) && p._rev > 0);
  const stageCount = (list, st) => list.filter((p) => p._stage === st).length;

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`${name}の案件`}>
          <div className="absolute inset-0 bg-black/30 animate-[fadeIn_.2s_ease]" onClick={() => onClose()} />
          <div className="relative h-full w-full max-w-md bg-white shadow-2xl flex flex-col animate-[slideIn_.28s_cubic-bezier(.2,.8,.2,1)]">
            <div className="px-5 pt-5 pb-4 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-400">{scopeLabel}・担当者</p>
                  <h3 className="text-lg font-bold text-gray-900">{name}</h3>
                </div>
                <button type="button" onClick={() => onClose()} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100" title="閉じる（Esc）">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4">
                <div className="bg-emerald-50 rounded-lg p-2.5">
                  <p className="text-[11px] text-emerald-700">売上</p>
                  <p className="text-base font-bold text-gray-900 tabular-nums">{man(staffTotal)}</p>
                  <p className="text-[11px] text-gray-500 tabular-nums">全体の{scopedTotal ? Math.round((staffTotal / scopedTotal) * 100) : 0}%</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <p className="text-[11px] text-gray-500">受注件数</p>
                  <p className="text-base font-bold text-gray-900 tabular-nums">{staffOrdered}件</p>
                  <p className="text-[11px] text-gray-500 tabular-nums">商談中 {stageCount(staffProjects, "商談中")}・TS {staffTs.length}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <p className="text-[11px] text-gray-500">平均単価</p>
                  <p className="text-base font-bold text-gray-900 tabular-nums">{staffSalesPaid.length ? man(staffSalesPaid.reduce((a, p) => a + p._rev, 0) / staffSalesPaid.length) : "-"}</p>
                  <p className="text-[11px] text-gray-500">営業の案件で</p>
                </div>
              </div>
              <div className="flex gap-1 mt-4 text-xs">
                {[["rev", "売上順"], ["date", "新しい順"]].map(([k, l]) => (
                  <button key={k} type="button" onClick={() => setStaffSort(k)}
                    className={`px-2.5 py-1 rounded-full transition-colors ${staffSort === k ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {STAGES.map((st) => {
                const list = staffProjects.filter((p) => p._stage === st);
                if (!list.length) return null;
                const sum = list.reduce((a, p) => a + p._rev, 0);
                return (
                  <div key={st}>
                    <div className={`sticky top-0 z-10 flex items-center justify-between px-5 py-2 text-xs font-bold border-b border-gray-100 ${st === "完了" ? "bg-emerald-50 text-emerald-800" : st === "仕掛り" ? "bg-amber-50 text-amber-800" : st === "トラブル対応" ? "bg-orange-50 text-orange-800" : "bg-gray-50 text-gray-500"}`}>
                      <span>{st}<span className="ml-1.5 font-normal">{list.length}件</span></span>
                      {st !== "商談中" && <span className="tabular-nums">{man(sum)}</span>}
                    </div>
              {list.map((p, i) => (
                <a key={p.id} href={`/${secretPath}/projects/${p.id}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 px-5 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  style={{ animation: `fadeUp .3s ease both`, animationDelay: `${Math.min(i, 15) * 20}ms` }}>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-gray-400 tabular-nums">
                      {p.ad_number ? formatProjectNumber(p.prefix, p.ad_number) : "番号なし"}
                      <span className="ml-2">{p.status === "残金請求済" && String(p.prefix || "").toUpperCase() !== "SP" ? "完了" : getStatusText(p.status, p.prefix)}</span>
                    </p>
                    <p className="text-sm font-semibold text-gray-800 truncate">{p.project_name || "（案件名なし）"}</p>
                    <p className="text-xs text-gray-500 truncate">{p.client_name || "（取引先未設定）"}</p>
                  </div>
                  <p className={`text-sm font-bold tabular-nums whitespace-nowrap ${p._rev ? "text-gray-900" : "text-gray-300"}`}>{p._rev ? man(p._rev) : "¥0"}</p>
                </a>
              ))}
                  </div>
                );
              })}
            </div>
          </div>
          <style>{`@keyframes slideIn{from{transform:translateX(100%)}}@keyframes fadeIn{from{opacity:0}}@keyframes fadeUp{from{opacity:0;transform:translateY(6px)}}@media (prefers-reduced-motion:reduce){*{animation:none!important}}`}</style>
        </div>
  );
}
