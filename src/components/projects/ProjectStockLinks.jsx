"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createSecretUrl } from "@/utils/secretPath";

// ============================================================
// この案件にひもづく物（在庫ナビの在庫シートを読んで表示・読み取りのみ）
//   - 「この案件で発注」と「在庫から引当（別の発注番号の物）」を分けて見せる
//   - 発注した物が別の案件へ回っている場合（まとめ買い）は、その行き先も見せる
// ============================================================

const yen = (n) => `¥${Math.round(Number(n) || 0).toLocaleString()}`;

const STATUS_TONE = {
  引当済: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  出庫済: "bg-gray-100 text-gray-600 ring-gray-200",
  出庫済み: "bg-gray-100 text-gray-600 ring-gray-200",
};

function groupItems(items) {
  const g = {};
  items.forEach((it) => {
    const k = `${it.order}|${it.productName}`;
    (g[k] ||= { order: it.order, productName: it.productName, items: [], cost: 0, status: {} });
    g[k].items.push(it);
    g[k].cost += it.cost;
    const st = it.archived && !it.status ? "出庫済" : it.status;
    g[k].status[st] = (g[k].status[st] || 0) + 1;
  });
  return Object.values(g).sort((a, b) => (a.order || "").localeCompare(b.order || ""));
}

function ProjectRef({ number, links }) {
  const l = links?.[number];
  if (!l) return <span className="font-mono font-semibold">{number}</span>;
  return (
    <Link
      href={createSecretUrl(`/projects/${l.id}`)}
      className="font-mono font-semibold underline decoration-gray-300 underline-offset-2 hover:decoration-gray-900"
      title={l.name}
    >
      {number}
    </Link>
  );
}

function GroupRow({ group, links, showOrigin }) {
  const [open, setOpen] = useState(false);
  const n = group.items.length;
  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900 truncate">{group.productName || "（品名なし）"}</span>
            <span className="text-sm text-gray-500 tabular-nums">×{n}</span>
            {Object.entries(group.status).map(([st, c]) => (
              <span
                key={st}
                className={`text-[11px] px-1.5 py-0.5 rounded ring-1 ${STATUS_TONE[st] || "bg-amber-50 text-amber-700 ring-amber-200"}`}
              >
                {st}
                {Object.keys(group.status).length > 1 ? ` ${c}` : ""}
              </span>
            ))}
          </div>
          {showOrigin && group.order && (
            <div className="text-xs text-gray-500 mt-0.5">
              <ProjectRef number={group.order} links={links} /> で発注した物から
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm text-gray-700 tabular-nums">{yen(group.cost)}</span>
          <span className={`text-gray-400 text-xs transition-transform ${open ? "rotate-90" : ""}`}>▶</span>
        </div>
      </button>
      {open && (
        <div className="border-t border-gray-100 px-4 py-2">
          <table className="w-full text-xs">
            <tbody>
              {group.items.map((it) => (
                <tr key={it.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-1.5 font-mono text-gray-700">{it.serial || "—"}</td>
                  <td className="py-1.5 text-gray-500">{it.status || (it.archived ? "出庫済" : "")}</td>
                  <td className="py-1.5 text-gray-500">{it.shipDate ? `出庫 ${it.shipDate}` : it.location}</td>
                  <td className="py-1.5 text-right tabular-nums text-gray-700">{yen(it.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function ProjectStockLinks({ projectId }) {
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/inventory`);
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
  if (loading) return <div className="text-sm text-gray-500 py-4">在庫のひもづけを読み込み中...</div>;
  if (error)
    return <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>;

  const own = data.used.filter((u) => !u.fromStock);
  const fromStock = data.used.filter((u) => u.fromStock);
  const stockCost = fromStock.reduce((s, u) => s + u.cost, 0);
  const sent = data.sentTo;
  const sentOut = sent ? sent.destinations.reduce((s, d) => s + d.count, 0) : 0;

  if (!data.used.length && !sent) {
    return (
      <section>
        <h3 className="text-base font-semibold text-gray-900 mb-2">この案件にひもづく物</h3>
        <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4">
          在庫ナビで、この案件に引き当てた物はまだありません。
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {/* 在庫から引当（別の発注番号の物） */}
      {fromStock.length > 0 && (
        <div>
          <div className="flex items-end justify-between mb-2 gap-3">
            <div>
              <h3 className="text-base font-semibold text-gray-900">在庫から引き当てた物</h3>
              <p className="text-xs text-gray-500">別の発注番号で買った物です。上の支払いには入っていません</p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[11px] text-gray-500">取得金の合計</div>
              <div className="text-lg font-bold tabular-nums text-gray-900">{yen(stockCost)}</div>
            </div>
          </div>
          <div className="space-y-2">
            {groupItems(fromStock).map((g) => (
              <GroupRow key={`${g.order}|${g.productName}`} group={g} links={data.links} showOrigin />
            ))}
          </div>
        </div>
      )}

      {/* この案件で発注して、この案件で使う物 */}
      {own.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-2">
            この案件で発注した物 <span className="text-sm font-normal text-gray-500">{own.length}台</span>
          </h3>
          <div className="space-y-2">
            {groupItems(own).map((g) => (
              <GroupRow key={`${g.order}|${g.productName}`} group={g} links={data.links} />
            ))}
          </div>
        </div>
      )}

      {/* 発注した物の行き先（まとめ買い） */}
      {sent && (sentOut > 0 || sent.inStock > 0) && (
        <div>
          <h3 className="text-base font-semibold text-gray-900">この発注の行き先</h3>
          <p className="text-xs text-gray-500 mb-2">
            {data.key} で発注した {sent.total}台 のうち、別の案件に回った物と在庫に残っている物です
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {[
              ["この案件", sent.self],
              ["別の案件へ", sentOut],
              ["在庫に残り", sent.inStock],
              ["その他", sent.other],
            ].filter(([label, v]) => v > 0 || label === "別の案件へ").map(([label, v]) => (
              <div key={label} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                <div className="text-[11px] text-gray-500">{label}</div>
                <div className="text-lg font-bold tabular-nums text-gray-900">{v}</div>
              </div>
            ))}
          </div>
          {sent.destinations.length > 0 && (
            <div className="border border-gray-200 rounded-lg bg-white divide-y divide-gray-100">
              {sent.destinations.map((d) => (
                <div key={d.project} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <div className="min-w-0">
                    <ProjectRef number={d.project} links={data.links} />
                    {data.links?.[d.project]?.name && (
                      <span className="ml-2 text-gray-500 truncate">{data.links[d.project].name}</span>
                    )}
                    <div className="text-xs text-gray-500 truncate">
                      {Object.entries(d.products)
                        .map(([name, c]) => `${name} ×${c}`)
                        .join("、")}
                    </div>
                  </div>
                  <span className="tabular-nums font-semibold text-gray-900 shrink-0">{d.count}台</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-[11px] text-gray-400">
        ※ 在庫ナビの在庫シート（アーカイブ含む）を表示しています。取得金は在庫ナビに入っている1台ごとの値です
      </p>
    </section>
  );
}
