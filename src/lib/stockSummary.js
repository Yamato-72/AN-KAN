"use client";
import { useEffect, useState } from "react";

// 一覧の全カードで1回だけ取る（2分覚える）
let cache = { at: 0, promise: null };
function fetchSummary() {
  if (cache.promise && Date.now() - cache.at < 2 * 60 * 1000) return cache.promise;
  cache = {
    at: Date.now(),
    promise: fetch("/api/projects/stock-summary").then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
  };
  return cache.promise;
}

export function stockKey(prefix, adNumber) {
  if (adNumber === null || adNumber === undefined || adNumber === "") return "";
  return `${String(prefix || "AD").toUpperCase()}-${parseInt(adNumber, 10)}`;
}

export function useStockSummary(prefix, adNumber) {
  const [m, setM] = useState(null);
  useEffect(() => {
    let alive = true;
    const k = stockKey(prefix, adNumber);
    if (!k) return;
    fetchSummary().then((map) => alive && setM(map[k] || null));
    return () => { alive = false; };
  }, [prefix, adNumber]);
  return m;
}

// 表示用：数がある段だけ、流れの順に
export const STOCK_STAGES = [
  ["production", "生産・輸送中"],
  ["inspecting", "検品待ち"],
  ["inspected", "検品済み"],
  ["waiting", "出荷待ち"],
  ["shipped", "出荷済み"],
];
