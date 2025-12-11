"use client";

import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useProjects } from "@/hooks/useProjects";
import { MonthlyRevenueChart } from "@/components/analysis/MonthlyRevenueChart";


export default function AnalysisPage({ params }) {
  const { userId } = params; // A / B / F など（staff_members.code）

  const [staff, setStaff] = useState(null);
  const [staffLoading, setStaffLoading] = useState(true);
  const [staffError, setStaffError] = useState(null);

  // ▼ スタッフ情報取得（名前を出したいので）
  useEffect(() => {
    const fetchStaffInfo = async () => {
      if (!userId) {
        setStaffLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/staff");
        if (!res.ok) throw new Error("Failed to fetch staff");
        const staffList = await res.json();

        // code または id で一致するスタッフを取得
        const found = staffList.find(
          (s) => s.code === userId || String(s.id) === String(userId),
        );

        if (!found) {
          setStaffError("スタッフ情報が見つかりません。");
        } else {
          setStaff(found);
        }
      } catch (err) {
        console.error(err);
        setStaffError("スタッフ情報の取得に失敗しました。");
      } finally {
        setStaffLoading(false);
      }
    };

    fetchStaffInfo();
  }, [userId]);

  // ▼ userId が確定していない場合（/analysis 単体で来た等）
  if (!userId) {
    return (
      <div className="min-h-screen bg-gray-50 font-inter">
        <Sidebar />
        <main className="lg:ml-16 p-6">
          <div className="max-w-lg mx-auto mt-10 bg-white rounded-lg shadow p-6 text-center">
            <h1 className="text-xl font-bold mb-2 text-red-600">
              ユーザーが選択されていません
            </h1>
            <p className="text-gray-700">
              先にスタッフを選択してダッシュボードにログインしてから、
              分析ページにアクセスしてください。
            </p>
          </div>
        </main>
      </div>
    );
  }

  // ▼ 担当者コード（useProjects 用）
  const staffCode = staff?.code || userId;

  const {
    data: projects,
    isLoading: projectsLoading,
    error: projectsError,
  } = useProjects(staffCode);

  // ▼ 金額集計（見積・売上・残高、ステータス別、月別）
  const {
    totalEstimated,
    totalRevenue,
    totalOutstanding,
    statusSummary,
    monthlySummary,
  } = useMemo(() => {
    if (!projects || projects.length === 0) {
      return {
        totalEstimated: 0,
        totalRevenue: 0,
        totalOutstanding: 0,
        statusSummary: [],
        monthlySummary: [],
      };
    }

    let estTotal = 0;
    let revTotal = 0;

    const statusMap = {};
    const monthMap = {};

    projects.forEach((p) => {
      const est =
        Number(p.estimated_amount ?? p.estimatedAmount ?? 0) || 0;
      const rev = Number(p.revenue ?? 0) || 0;
      estTotal += est;
      revTotal += rev;

      // ---- ステータス別 ----
      const status = p.status || "不明";
      if (!statusMap[status]) {
        statusMap[status] = {
          status,
          count: 0,
          estimated: 0,
          revenue: 0,
        };
      }
      statusMap[status].count += 1;
      statusMap[status].estimated += est;
      statusMap[status].revenue += rev;

      // ---- 月別（納品日 or 設置日 or 作成日）----
      const dateStr =
        p.delivery_date ||
        p.installation_date ||
        p.created_at ||
        null;

      if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          const key = `${d.getFullYear()}-${String(
            d.getMonth() + 1,
          ).padStart(2, "0")}`; // YYYY-MM

          if (!monthMap[key]) {
            monthMap[key] = {
              month: key,
              estimated: 0,
              revenue: 0,
            };
          }
          monthMap[key].estimated += est;
          monthMap[key].revenue += rev;
        }
      }
    });

    const outstanding = estTotal - revTotal;

    const statusSummaryArr = Object.values(statusMap).sort((a, b) => {
      // 大きい金額順
      return b.estimated - a.estimated;
    });

    const monthlySummaryArr = Object.values(monthMap).sort((a, b) =>
      a.month.localeCompare(b.month),
    );

    return {
      totalEstimated: estTotal,
      totalRevenue: revTotal,
      totalOutstanding: outstanding,
      statusSummary: statusSummaryArr,
      monthlySummary: monthlySummaryArr,
    };
  }, [projects]);

  const displayName = staff?.name || `${userId} さん`;

  const formatYen = (value) =>
    value.toLocaleString("ja-JP", {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0,
    });

  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      <Sidebar />

      <main className="lg:ml-16 p-6 space-y-6">
        {/* タイトル */}
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">
            {displayName}の金額分析
          </h1>
          <p className="text-sm text-gray-600">
            担当している案件の見積金額・売上・残金の状況を確認できます。
          </p>
        </header>

        {/* ③ 月別 金額グラフ */}
        <section className="bg-white rounded-xl shadow p-4">
        <h2 className="text-sm font-semibold mb-3">
            月別の見積・売上推移（グラフ）
        </h2>
        <MonthlyRevenueChart data={monthlySummary} />
        </section>


        {/* スタッフエラー表示 */}
        {staffError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-2 text-sm">
            {staffError}
          </div>
        )}

        {/* ローディング・エラー */}
        {projectsLoading && (
          <p className="text-gray-600 text-sm">案件データを読み込み中です…</p>
        )}
        {projectsError && (
          <p className="text-red-500 text-sm">
            案件データの取得に失敗しました。
          </p>
        )}

        {!projectsLoading && !projectsError && (
          <>
            {/* ① サマリーカード */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl shadow p-4">
                <h2 className="text-xs font-semibold text-gray-500">
                  担当案件の見積金額合計
                </h2>
                <p className="mt-2 text-xl font-bold">
                  {formatYen(totalEstimated)}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  見積ベースの売上ポテンシャル
                </p>
              </div>

              <div className="bg-white rounded-xl shadow p-4">
                <h2 className="text-xs font-semibold text-gray-500">
                  売上確定額（revenue）合計
                </h2>
                <p className="mt-2 text-xl font-bold">
                  {formatYen(totalRevenue)}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  実際に売上計上された金額
                </p>
              </div>

              <div className="bg-white rounded-xl shadow p-4">
                <h2 className="text-xs font-semibold text-gray-500">
                  残りポテンシャル（見積−売上）
                </h2>
                <p
                  className={`mt-2 text-xl font-bold ${
                    totalOutstanding >= 0 ? "text-blue-600" : "text-red-600"
                  }`}
                >
                  {formatYen(totalOutstanding)}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  まだ売上にできていない金額の目安
                </p>
              </div>
            </section>

            {/* ② ステータス別 金額サマリ */}
            <section className="bg-white rounded-xl shadow p-4">
              <h2 className="text-sm font-semibold mb-3">
                ステータス別 金額サマリー
              </h2>
              {statusSummary.length === 0 ? (
                <p className="text-sm text-gray-500">
                  対象の案件がありません。
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-2 px-2">ステータス</th>
                        <th className="text-right py-2 px-2">件数</th>
                        <th className="text-right py-2 px-2">見積合計</th>
                        <th className="text-right py-2 px-2">売上合計</th>
                        <th className="text-right py-2 px-2">
                          残り（見積−売上）
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {statusSummary.map((row) => (
                        <tr key={row.status} className="border-b last:border-b-0">
                          <td className="py-2 px-2">{row.status}</td>
                          <td className="py-2 px-2 text-right">
                            {row.count}
                          </td>
                          <td className="py-2 px-2 text-right">
                            {formatYen(row.estimated)}
                          </td>
                          <td className="py-2 px-2 text-right">
                            {formatYen(row.revenue)}
                          </td>
                          <td className="py-2 px-2 text-right">
                            {formatYen(row.estimated - row.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* ③ 月別 金額サマリ（シンプルな表） */}
            <section className="bg-white rounded-xl shadow p-4">
              <h2 className="text-sm font-semibold mb-3">
                月別の見積・売上推移（納品日/設置日ベース）
              </h2>
              {monthlySummary.length === 0 ? (
                <p className="text-sm text-gray-500">
                  日付情報のある案件がありません。
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-2 px-2">年月</th>
                        <th className="text-right py-2 px-2">見積合計</th>
                        <th className="text-right py-2 px-2">売上合計</th>
                        <th className="text-right py-2 px-2">
                          残り（見積−売上）
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlySummary.map((row) => (
                        <tr key={row.month} className="border-b last:border-b-0">
                          <td className="py-2 px-2">{row.month}</td>
                          <td className="py-2 px-2 text-right">
                            {formatYen(row.estimated)}
                          </td>
                          <td className="py-2 px-2 text-right">
                            {formatYen(row.revenue)}
                          </td>
                          <td className="py-2 px-2 text-right">
                            {formatYen(row.estimated - row.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
