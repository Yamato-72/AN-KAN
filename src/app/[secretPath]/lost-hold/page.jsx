"use client";
// 「失注・保留」ページは、プロジェクト一覧の絞り込み（失注・保留）に移しました（2026-11-29）
//   古いURLやブックマークから来た人は、一覧の「失注」へ送る
import { useEffect } from "react";
import { useParams } from "next/navigation";

export default function LostHoldRedirect() {
  const params = useParams();
  useEffect(() => {
    window.location.replace(`/${params.secretPath}/all-project?filter=lost`);
  }, [params.secretPath]);
  return <div className="min-h-screen grid place-items-center text-sm text-gray-400">プロジェクト一覧へ移動しています…</div>;
}
