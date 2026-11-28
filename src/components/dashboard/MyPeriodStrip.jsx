"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { prepareSales, isOrdered, man } from "@/lib/salesAnalytics";
import { StaffSalesPanel } from "@/components/analytics/StaffSalesPanel";

// ============================================================
// 「自分の今期」の帯（ダッシュボードの上）
//   ログインしている本人が、自分のダッシュボードを見ているときだけ出す
//   数え方は売上分析と同じ（受注＝完了＋仕掛り、商談中・TSは別枠、SPは除外）
// ============================================================
export function MyPeriodStrip({ staffCode, secretPath }) {
  const [me, setMe] = useState(null);
  const [projects, setProjects] = useState(null);
  const [open, setOpen] = useState(false);

  // ログイン中の本人
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMe(d?.user || null))
      .catch(() => setMe(null));
  }, []);

  const isMine = !!me?.code && me.code === staffCode;

  // 全体の割合を出すため、全員分を読む（本人のときだけ）
  useEffect(() => {
    if (!isMine) return;
    fetch("/api/projects?folder=active")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setProjects(Array.isArray(d) ? d : []))
      .catch(() => setProjects([]));
  }, [isMine]);

  const data = useMemo(() => {
    if (!projects) return null;
    const all = prepareSales(projects);
    if (!all.length) return null;
    const period = Math.max(...all.map((p) => p._period));
    const scoped = all.filter((p) => p._period === period);
    const mine = scoped.filter((p) => p.assigned_team_member === staffCode);
    const total = scoped.reduce((a, p) => a + p._rev, 0);
    const myRev = mine.reduce((a, p) => a + p._rev, 0);
    const count = (st) => mine.filter((p) => p._stage === st).length;
    return {
      period, scoped, mine, total, myRev,
      ordered: mine.filter(isOrdered).length,
      done: count("完了"), wip: count("仕掛り"), talks: count("商談中"), ts: count("トラブル対応"),
      name: mine[0]?.assigned_team_member_name || me?.name || "",
    };
  }, [projects, staffCode, me]);

  if (!isMine || !data) return null;
  const pct = data.total ? Math.round((data.myRev / data.total) * 100) : 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group w-full text-left bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 hover:border-emerald-300 hover:shadow-sm transition-all"
        title="自分の案件一覧を見る"
      >
        <span className="text-xs font-bold text-gray-500">第{data.period}期の自分</span>
        <span className="flex items-baseline gap-1.5">
          <span className="text-[11px] text-gray-400">売上</span>
          <span className="text-lg font-bold text-gray-900 tabular-nums">{man(data.myRev)}</span>
          <span className="text-[11px] text-emerald-600 tabular-nums">全体の{pct}%</span>
        </span>
        <span className="flex items-baseline gap-1.5">
          <span className="text-[11px] text-gray-400">受注</span>
          <span className="text-lg font-bold text-gray-900 tabular-nums">{data.ordered}件</span>
          <span className="text-[11px] text-gray-400 tabular-nums">完了{data.done}・仕掛り{data.wip}</span>
        </span>
        <span className="flex items-baseline gap-1.5">
          <span className="text-[11px] text-gray-400">商談中</span>
          <span className="text-base font-bold text-gray-700 tabular-nums">{data.talks}</span>
        </span>
        {data.ts > 0 && (
          <span className="flex items-baseline gap-1.5">
            <span className="text-[11px] text-gray-400">TS</span>
            <span className="text-base font-bold text-orange-500 tabular-nums">{data.ts}</span>
          </span>
        )}
        <span className="ml-auto text-xs text-gray-400 group-hover:text-emerald-600 flex items-center gap-0.5">
          くわしく <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </button>
      {open && (
        <StaffSalesPanel
          name={data.name}
          projects={data.mine}
          scopeLabel={`第${data.period}期`}
          scopedTotal={data.total}
          secretPath={secretPath}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
