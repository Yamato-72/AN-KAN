"use client";

import { useState, useEffect } from "react";

// ============================================================
// 発注デポジットの支払状況（支払ナビの案件シートを読んで表示・読み取りのみ）
//   - 回ごとに「1回目：済(9/22) / 未」を表示
//   - 上部にサマリ「支払 3/3 済」など。全回済なら「支払済」
// ============================================================

// "2025-09-22" → "9/22"
function shortDate(d) {
  if (!d) return "";
  const m = String(d).match(/^\d{4}-(\d{2})-(\d{2})/);
  if (!m) return d;
  return `${parseInt(m[1], 10)}/${parseInt(m[2], 10)}`;
}

const yen = (n) =>
  n === null || n === undefined || n === "" ? "" : `¥${Number(n).toLocaleString()}`;

export function ProjectDepositStatus({ projectId }) {
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/deposit-status`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "取得に失敗しました");
        if (alive) setState({ loading: false, error: null, data });
      } catch (e) {
        if (alive) setState({ loading: false, error: e.message, data: null });
      }
    })();
    return () => {
      alive = false;
    };
  }, [projectId]);

  const { loading, error, data } = state;

  if (loading) {
    return <div className="text-sm text-gray-500 py-4">支払状況を読み込み中...</div>;
  }
  if (error) {
    return (
      <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
        {error}
      </div>
    );
  }
  if (!data.found || !data.deposits || data.deposits.length === 0) {
    return (
      <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4">
        この案件の発注支払データは支払ナビにまだありません。
      </div>
    );
  }

  const deposits = data.deposits;
  const total = deposits.length;
  const paidCount = deposits.filter((d) => d.paid).length;
  const remaining = total - paidCount;
  const allPaid = remaining === 0;

  return (
    <div>
      {/* サマリ */}
      <div className="flex items-center gap-3 mb-4">
        {allPaid ? (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-700">
            支払済（全{total}回）
          </span>
        ) : (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700">
            支払 {paidCount}/{total} 済・残{remaining}
          </span>
        )}
        {data.productName && (
          <span className="text-sm text-gray-500">{data.productName}</span>
        )}
      </div>

      {/* 回ごとの明細 */}
      <div className="space-y-2">
        {deposits.map((d, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <span className="font-medium text-gray-800">
                {d.depositNumber || i + 1}回目
              </span>
              {d.percentage ? (
                <span className="text-xs text-gray-400">{d.percentage}%</span>
              ) : null}
              {d.amountJPY ? (
                <span className="text-sm text-gray-600">{yen(d.amountJPY)}</span>
              ) : d.amountUSD ? (
                <span className="text-sm text-gray-600">${d.amountUSD}</span>
              ) : null}
            </div>
            <div>
              {d.paid ? (
                <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
                  済{d.paidDate ? `（${shortDate(d.paidDate)}）` : ""}
                </span>
              ) : (
                <span className="inline-flex items-center text-sm font-medium text-gray-400">
                  未
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-gray-400 mt-3">
        ※ 支払ナビの案件データを表示しています（入力は支払ナビで行います）
      </p>
    </div>
  );
}
