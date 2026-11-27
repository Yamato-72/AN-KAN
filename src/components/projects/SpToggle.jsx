"use client";

import { useEffect, useState } from "react";
import { Package } from "lucide-react";

// ============================================================
// 「SPも表示」の切り替え（SP＝在庫の発注は、ふだんは一覧に出さない）
//   選んだ状態はこのブラウザに覚えておく
// ============================================================
const KEY = "ankan_show_sp";

export function useShowSp() {
  const [showSp, setShowSp] = useState(false);
  useEffect(() => {
    try { setShowSp(localStorage.getItem(KEY) === "1"); } catch {}
  }, []);
  const toggle = () =>
    setShowSp((v) => {
      try { localStorage.setItem(KEY, v ? "0" : "1"); } catch {}
      return !v;
    });
  return [showSp, toggle];
}

export function isSpProject(p) {
  return String(p?.prefix || "").toUpperCase() === "SP";
}

export function SpToggle({ showSp, onToggle, count }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={showSp ? "SP（在庫の発注）を一覧から隠す" : "SP（在庫の発注）も一覧に出す"}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition ${
        showSp
          ? "border-amber-300 bg-amber-50 text-amber-800"
          : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
      }`}
    >
      <span
        className={`relative inline-block h-4 w-7 rounded-full transition ${showSp ? "bg-amber-500" : "bg-gray-300"}`}
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all ${showSp ? "left-3.5" : "left-0.5"}`}
        />
      </span>
      <Package className="h-3.5 w-3.5" />
      SPも表示{typeof count === "number" && count > 0 ? <span className="text-xs opacity-70">（{count}）</span> : null}
    </button>
  );
}
