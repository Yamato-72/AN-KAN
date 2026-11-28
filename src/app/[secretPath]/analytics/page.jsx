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
import { ArrowLeft, TrendingUp, Users, Building, CalendarRange, X, ChevronRight } from "lucide-react";
import { formatProjectNumber } from "@/lib/prefixes";
import { getStatusText } from "@/utils/status";

// ============================================================
// 経営分析ページ（/analytics）
//   - 期をまたいだ売上の俯瞰：期別推移・顧客ランキング・担当者別・月次季節性
//   - データ源はAN-KANの案件（失注・保留は除外）。売上はrevenue列
//   - 売上は /api/projects が支払ナビのシートを重ねて返す（AN-KANの写しは使わない）
// ============================================================

const FY_BASE_YEAR = 2019; // 1期 = 2019年7月〜

// 案件の期を判定（納期 → 問い合わせ日 → 作成日）
const periodOf = (p) => {
  const dateStr = p.sales_date || p.delivery_date || p.inquiry_date || p.created_at; // 売上の納品日（支払ナビ）を最優先
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  const fyStartYear = d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
  return fyStartYear - FY_BASE_YEAR + 1;
};

// 会計月インデックス（7月=0 … 6月=11）と表示名
const fiscalMonthOf = (p) => {
  const dateStr = p.sales_date || p.delivery_date || p.inquiry_date || p.created_at; // 売上の納品日（支払ナビ）を最優先
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return (d.getMonth() + 6) % 12;
};
const FISCAL_MONTH_LABELS = ["7月","8月","9月","10月","11月","12月","1月","2月","3月","4月","5月","6月"];

// 案件の段階（売上分析での呼び方）
//   商談中＝リード・打ち合わせ中（まだ受注していない）
//   仕掛り＝受注済み・手配中（受注したが、まだ完了していない）
//   完了　＝残金請求済
//   トラブル対応＝TS（修理・トラブル対応。営業の件数には入れず別枠で数える）
//   SP（在庫の発注）は売上ではないので、売上分析には入れない
const prefixOf = (p) => String(p.prefix || "AD").toUpperCase();
const stageOf = (p) => {
  if (prefixOf(p) === "TS") return "トラブル対応";
  if (p.status === "残金請求済") return "完了";
  if (p.status === "リード" || p.status === "打ち合わせ中") return "商談中";
  return "仕掛り";
};
const STAGES = ["完了", "仕掛り", "商談中", "トラブル対応"];
const isOrdered = (p) => p._stage === "完了" || p._stage === "仕掛り"; // 営業で受注した案件

const yen = (n) => "¥" + Math.round(n).toLocaleString();
const man = (n) => {
  const v = Math.round(n);
  if (Math.abs(v) >= 100000000) return "¥" + (Math.round(v / 1000000) / 100).toLocaleString() + "億";
  if (Math.abs(v) >= 10000) return "¥" + Math.round(v / 10000).toLocaleString() + "万";
  return "¥" + v.toLocaleString();
};

export default function AnalyticsPage() {
  const params = useParams();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState(null); // 対象期（null=最新期を自動選択）
  const [staffOpen, setStaffOpen] = useState(null); // 名前を押した担当者（その人の数字と案件一覧を出す）
  const [staffSort, setStaffSort] = useState("rev"); // rev=売上順 / date=新しい順

  useEffect(() => {
    fetch("/api/projects?folder=active")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setProjects(Array.isArray(data) ? data : []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  // 売上を持つ案件だけ（分析の対象）。期も付与
  const revProjects = useMemo(
    () =>
      projects
        .map((p) => ({
          ...p,
          _period: periodOf(p),
          _rev: Number(p.revenue ?? 0) || 0,
          _fm: fiscalMonthOf(p),
          _stage: stageOf(p),
        }))
        .filter((p) => p._period && p._period > 0 && prefixOf(p) !== "SP"),
    [projects],
  );

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
  const staffOf = (p) => p.assigned_team_member_name || "担当者なし";
  const staffProjects = useMemo(() => {
    if (!staffOpen) return [];
    const dateOf = (p) => p.sales_date || p.delivery_date || p.inquiry_date || p.created_at || "";
    return scoped
      .filter((p) => staffOf(p) === staffOpen)
      .sort((a, b) =>
        staffSort === "rev" ? b._rev - a._rev : String(dateOf(b)).localeCompare(String(dateOf(a))),
      );
  }, [scoped, staffOpen, staffSort]);
  const staffTotal = staffProjects.reduce((a, p) => a + p._rev, 0);
  const staffPaid = staffProjects.filter((p) => p._rev > 0).length;
  const staffOrdered = staffProjects.filter(isOrdered).length;
  const staffTs = staffProjects.filter((p) => p._stage === "トラブル対応");
  const staffSalesPaid = staffProjects.filter((p) => isOrdered(p) && p._rev > 0);
  const staffClients = new Set(staffProjects.map((p) => p.client_name).filter(Boolean)).size;
  useEffect(() => {
    if (!staffOpen) return;
    const onKey = (e) => e.key === "Escape" && setStaffOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [staffOpen]);

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
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`${staffOpen}の案件`}>
          <div className="absolute inset-0 bg-black/30 animate-[fadeIn_.2s_ease]" onClick={() => setStaffOpen(null)} />
          <div className="relative h-full w-full max-w-md bg-white shadow-2xl flex flex-col animate-[slideIn_.28s_cubic-bezier(.2,.8,.2,1)]">
            <div className="px-5 pt-5 pb-4 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-400">{scopeLabel}・担当者</p>
                  <h3 className="text-lg font-bold text-gray-900">{staffOpen}</h3>
                </div>
                <button type="button" onClick={() => setStaffOpen(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100" title="閉じる（Esc）">
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
                <a key={p.id} href={`/${params.secretPath}/projects/${p.id}`} target="_blank" rel="noopener noreferrer"
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
      )}
    </div>
  );
}
