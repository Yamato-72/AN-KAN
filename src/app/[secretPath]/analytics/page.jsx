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
import { ArrowLeft, TrendingUp, Users, Building, CalendarRange } from "lucide-react";

// ============================================================
// 経営分析ページ（/analytics）
//   - 期をまたいだ売上の俯瞰：期別推移・顧客ランキング・担当者別・月次季節性
//   - データ源はAN-KANの案件（失注・保留は除外）。売上はrevenue列
//   - 注意：進行中の期はAN-KANに同期済みの売上のみ（確定はダッシュボード/支払ナビ）
// ============================================================

const FY_BASE_YEAR = 2019; // 1期 = 2019年7月〜

// 案件の期を判定（納期 → 問い合わせ日 → 作成日）
const periodOf = (p) => {
  const dateStr = p.delivery_date || p.inquiry_date || p.created_at;
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  const fyStartYear = d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
  return fyStartYear - FY_BASE_YEAR + 1;
};

// 会計月インデックス（7月=0 … 6月=11）と表示名
const fiscalMonthOf = (p) => {
  const dateStr = p.delivery_date || p.inquiry_date || p.created_at;
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return (d.getMonth() + 6) % 12;
};
const FISCAL_MONTH_LABELS = ["7月","8月","9月","10月","11月","12月","1月","2月","3月","4月","5月","6月"];

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
        }))
        .filter((p) => p._period && p._period > 0),
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
      map[p._period].count += 1;
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
      map[name].count += 1;
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
      if (!map[name]) map[name] = { revenue: 0, count: 0 };
      map[name].revenue += p._rev;
      map[name].count += 1;
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

  const scopedTotal = scoped.reduce((a, p) => a + p._rev, 0);
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
          売上はAN-KANに記録された金額（過去期＝取り込み値・進行期＝支払ナビ同期分）。失注・保留は除外。進行中の期の確定数字はYSダッシュボードで。
        </p>

        {/* サマリー */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-5">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500">{scopeLabel}の売上合計</p>
            <p className="text-xl font-bold text-gray-900 tabular-nums">{man(scopedTotal)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500">{scopeLabel}の案件数</p>
            <p className="text-xl font-bold text-gray-900 tabular-nums">{scoped.length}件</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 col-span-2 sm:col-span-1">
            <p className="text-xs text-gray-500">{scopeLabel}の平均案件単価</p>
            <p className="text-xl font-bold text-gray-900 tabular-nums">
              {scoped.filter((p) => p._rev > 0).length
                ? man(scopedTotal / scoped.filter((p) => p._rev > 0).length)
                : "-"}
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
            </h2>
            {byStaff.length === 0 ? (
              <p className="text-sm text-gray-400">売上データがありません</p>
            ) : (
              <div className="space-y-2.5">
                {byStaff.map((s) => (
                  <div key={s.name}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-gray-700 truncate mr-2">{s.name}</span>
                      <span className="text-gray-900 font-semibold whitespace-nowrap tabular-nums">
                        {man(s.revenue)}
                        <span className="text-gray-400 font-normal ml-1">{s.count}件</span>
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${(s.revenue / maxStaffRev) * 100}%` }}
                      />
                    </div>
                  </div>
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
    </div>
  );
}
