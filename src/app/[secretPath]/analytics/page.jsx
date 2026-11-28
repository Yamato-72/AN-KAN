"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
} from "recharts";
import { ArrowLeft, TrendingUp, Users, Building, CalendarRange, ChevronRight } from "lucide-react";

// ============================================================
// 経営分析ページ（/analytics）
//   - 期をまたいだ売上の俯瞰：期別推移・顧客ランキング・担当者別・月次季節性
//   - データ源はAN-KANの案件（失注・保留は除外）。売上はrevenue列
//   - 売上は /api/projects が支払ナビのシートを重ねて返す（AN-KANの写しは使わない）
// ============================================================

import {
  FISCAL_MONTH_LABELS, STAGES, isOrdered, yen, man, prepareSales, staffOf,
} from "@/lib/salesAnalytics";
import { StaffSalesPanel } from "@/components/analytics/StaffSalesPanel";

export default function AnalyticsPage() {
  const params = useParams();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState(null); // 対象期（null=最新期を自動選択）
  const [staffOpen, setStaffOpen] = useState(null); // 名前を押した担当者（その人の数字と案件一覧を出す）

  useEffect(() => {
    fetch("/api/projects?folder=active")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setProjects(Array.isArray(data) ? data : []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  // 売上を持つ案件だけ（分析の対象）。期も付与
  const revProjects = useMemo(() => prepareSales(projects), [projects]);

  // データに実在する期（昇順）
  const availablePeriods = useMemo(() => {
    const s = new Set();
    revProjects.forEach((p) => s.add(p._period));
    return [...s].sort((a, b) => a - b);
  }, [revProjects]);

  // ① 期別売上推移（全期固定）
  const byPeriod = useMemo(() => {
    const map = {};
    revProjects.forEach((p) => {
      if (!map[p._period]) map[p._period] = { revenue: 0, count: 0 };
      map[p._period].revenue += p._rev;
      if (isOrdered(p)) map[p._period].count += 1; // 件数は営業で受注した案件だけ
    });
    return availablePeriods.map((n) => ({
      name: `第${n}期`,
      revenue: map[n]?.revenue || 0,
      count: map[n]?.count || 0,
    }));
  }, [revProjects, availablePeriods]);

  // 実際に使う期：未選択なら最新期
  const effectivePeriod =
    periodFilter ??
    (availablePeriods.length ? availablePeriods[availablePeriods.length - 1] : null);

  // 選択期で絞った母集団（サマリー・顧客・担当者・月次に効く）
  const scoped = useMemo(
    () => revProjects.filter((p) => p._period === Number(effectivePeriod)),
    [revProjects, effectivePeriod],
  );

  // ② 顧客別ランキング TOP10
  const byClient = useMemo(() => {
    const map = {};
    scoped.forEach((p) => {
      const name = p.client_name || "（取引先未設定）";
      if (!map[name]) map[name] = { revenue: 0, count: 0 };
      map[name].revenue += p._rev;
      if (isOrdered(p)) map[name].count += 1; // 件数は営業で受注した案件（完了＋仕掛り）だけ
    });
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [scoped]);

  // ③ 担当者別
  const byStaff = useMemo(() => {
    const map = {};
    scoped.forEach((p) => {
      const name = p.assigned_team_member_name
        ? `${p.assigned_team_member_name}`
        : "担当者なし";
      if (!map[name]) map[name] = { revenue: 0, count: 0, talks: 0, ts: 0 };
      map[name].revenue += p._rev;
      if (p._stage === "商談中") map[name].talks += 1;
      else if (p._stage === "トラブル対応") map[name].ts += 1;
      else map[name].count += 1; // 件数は営業で受注した案件（完了＋仕掛り）だけ
    });
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [scoped]);

  // ④ 月次（7月始まり）
  const byMonth = useMemo(() => {
    const arr = FISCAL_MONTH_LABELS.map((label) => ({ name: label, revenue: 0, count: 0 }));
    scoped.forEach((p) => {
      if (p._fm === null) return;
      arr[p._fm].revenue += p._rev;
      arr[p._fm].count += 1;
    });
    return arr;
  }, [scoped]);

  // 担当者を押したとき：その人の案件（選択期）
  const scopedTotal = scoped.reduce((a, p) => a + p._rev, 0);
  const stageCount = (list, st) => list.filter((p) => p._stage === st).length;
  const scopedOrdered = scoped.filter(isOrdered).length;
  const scopedTs = scoped.filter((p) => p._stage === "トラブル対応");
  const scopedTsRev = scopedTs.reduce((a, p) => a + p._rev, 0);
  const salesPaid = scoped.filter((p) => isOrdered(p) && p._rev > 0);
  const maxClientRev = byClient[0]?.revenue || 1;
  const maxStaffRev = byStaff[0]?.revenue || 1;
  const scopeLabel = effectivePeriod ? `第${effectivePeriod}期` : "-";

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 text-sm">
        集計中...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-5xl mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center gap-3 mb-1 flex-wrap">
          <a
            href={`/${params.secretPath}/all-project`}
            className="text-gray-400 hover:text-gray-600"
            title="全案件へ戻る"
          >
            <ArrowLeft className="h-5 w-5" />
          </a>
          <h1 className="text-xl font-bold text-gray-800">売上分析</h1>
          <select
            className="ml-auto border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white font-semibold"
            value={effectivePeriod ?? ""}
            onChange={(e) => setPeriodFilter(e.target.value)}
            title="表示する期"
          >
            {[...availablePeriods].reverse().map((n) => (
              <option key={n} value={n}>第{n}期</option>
            ))}
          </select>
        </div>
        <p className="text-xs text-gray-400 mb-5">
          売上は支払ナビ（販売案件売上シート）の金額。シートに無い過去の案件は、取り込み時の金額。期は売上の納品日で判定。失注・保留は除外。件数は受注した案件だけ（完了＋仕掛り＝受注済み・手配中）。商談中（リード・打ち合わせ中）とトラブル対応（TS）は件数に入れず別に表示。SP（在庫の発注）は含めない。
        </p>

        {/* サマリー */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500">{scopeLabel}の売上合計</p>
            <p className="text-xl font-bold text-gray-900 tabular-nums">{man(scopedTotal)}</p>
            {scopedTsRev > 0 && <p className="text-[11px] text-gray-400 tabular-nums mt-0.5">うちトラブル対応 {man(scopedTsRev)}</p>}
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500">{scopeLabel}の受注件数</p>
            <p className="text-xl font-bold text-gray-900 tabular-nums">{scopedOrdered}件</p>
            <p className="text-[11px] text-gray-400 tabular-nums mt-0.5">
              完了 {stageCount(scoped, "完了")}・仕掛り {stageCount(scoped, "仕掛り")}
              <span className="ml-2 text-gray-300">|</span>
              <span className="ml-2">商談中 {stageCount(scoped, "商談中")}</span>
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500">{scopeLabel}の平均案件単価</p>
            <p className="text-xl font-bold text-gray-900 tabular-nums">
              {salesPaid.length ? man(salesPaid.reduce((a, p) => a + p._rev, 0) / salesPaid.length) : "-"}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">営業の案件で</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500">{scopeLabel}のトラブル対応</p>
            <p className="text-xl font-bold text-gray-900 tabular-nums">{scopedTs.length}件</p>
            <p className="text-[11px] text-gray-400 tabular-nums mt-0.5">
              完了 {scopedTs.filter((p) => p.status === "残金請求済").length}・有償 {scopedTs.filter((p) => p._rev > 0).length}件
            </p>
          </div>
        </div>

        {/* ① 期別売上推移 */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
          <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-gray-400" />
            期別売上推移（全期）
          </h2>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byPeriod} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis tickFormatter={(v) => `${Math.round(v / 10000).toLocaleString()}万`} fontSize={11} width={70} />
                <Tooltip formatter={(v, n) => (n === "revenue" ? [yen(v), "売上"] : [v + "件", "案件数"])} />
                <Bar dataKey="revenue" name="revenue" fill="#D6001C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-2 flex-wrap">
            {byPeriod.map((p) => (
              <span key={p.name} className="text-xs text-gray-500">
                {p.name}: <b className="text-gray-700">{man(p.revenue)}</b>（{p.count}件）
              </span>
            ))}
          </div>
        </div>

        {/* ② 顧客ランキング ＋ ③ 担当者別 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-4">
              <Building className="h-4 w-4 text-gray-400" />
              顧客別売上 TOP10（{scopeLabel}）
            </h2>
            {byClient.length === 0 ? (
              <p className="text-sm text-gray-400">売上データがありません</p>
            ) : (
              <div className="space-y-2.5">
                {byClient.map((c, i) => (
                  <div key={c.name}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-gray-700 truncate mr-2">
                        <span className="text-gray-400 mr-1.5">{i + 1}.</span>
                        {c.name}
                      </span>
                      <span className="text-gray-900 font-semibold whitespace-nowrap tabular-nums">
                        {man(c.revenue)}
                        <span className="text-gray-400 font-normal ml-1">{c.count}件</span>
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${(c.revenue / maxClientRev) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-4">
              <Users className="h-4 w-4 text-gray-400" />
              担当者別売上（{scopeLabel}）
              <span className="ml-auto text-[11px] font-normal text-gray-400">名前を押すと案件一覧</span>
            </h2>
            {byStaff.length === 0 ? (
              <p className="text-sm text-gray-400">売上データがありません</p>
            ) : (
              <div className="space-y-2.5">
                {byStaff.map((s) => (
                  <button
                    type="button"
                    key={s.name}
                    onClick={() => setStaffOpen(s.name)}
                    className="group block w-full text-left -mx-2 px-2 py-1 rounded-lg hover:bg-emerald-50 transition-colors"
                    title={`${s.name}の案件一覧を見る`}
                  >
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-gray-700 truncate mr-2 flex items-center gap-1 group-hover:text-emerald-700 group-hover:font-semibold">
                        {s.name}
                        <ChevronRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                      </span>
                      <span className="text-gray-900 font-semibold whitespace-nowrap tabular-nums">
                        {man(s.revenue)}
                        <span className="text-gray-400 font-normal ml-1">{s.count}件</span>
                        {s.talks > 0 && <span className="text-gray-300 font-normal ml-1">商談中{s.talks}</span>}
                        {s.ts > 0 && <span className="text-orange-300 font-normal ml-1">TS{s.ts}</span>}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${(s.revenue / maxStaffRev) * 100}%` }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ④ 月次季節性 */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-4">
            <CalendarRange className="h-4 w-4 text-gray-400" />
            月別売上（7月始まり・{scopeLabel}）
          </h2>
          <div className="w-full h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byMonth} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis tickFormatter={(v) => `${Math.round(v / 10000).toLocaleString()}万`} fontSize={11} width={70} />
                <Tooltip formatter={(v) => [yen(v), "売上"]} />
                <Bar dataKey="revenue" fill="#6366F1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            繁忙月の傾向確認用（納期ベース・7月始まり）
          </p>
        </div>
      </div>
      {/* 担当者の案件一覧（右から出るパネル） */}
      {staffOpen && (
        <StaffSalesPanel
          name={staffOpen}
          projects={scoped.filter((p) => staffOf(p) === staffOpen)}
          scopeLabel={scopeLabel}
          scopedTotal={scopedTotal}
          secretPath={params.secretPath}
          onClose={() => setStaffOpen(null)}
        />
      )}
    </div>
  );
}
