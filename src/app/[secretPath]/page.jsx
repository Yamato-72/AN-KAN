"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { StaffSelector } from "@/components/staff/StaffSalector";

export default function HomePage() {
  const router = useRouter();
  const params = useParams();
  // ログイン確認中は選択画面を出さない（一瞬見えるチラつき防止）
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // ログイン済み＆担当コードが紐付いていれば、本人のダッシュボードへ直行
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((me) => {
        if (me.user && me.user.allView) {
          // 案件を持たないメンバー（倉庫・管理部など）は全体ビューへ直行
          router.replace(`/${params.secretPath}/all-project`);
        } else if (me.user && me.user.code) {
          router.replace(`/${params.secretPath}/dashboard/${me.user.code}`);
        } else {
          setChecking(false); // 未ログイン等は従来通り選択画面
        }
      })
      .catch(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <StaffSelector />
    </div>
  );
}
