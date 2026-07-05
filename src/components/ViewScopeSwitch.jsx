"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { User, Users } from "lucide-react";

// ============================================================
// 「自分の案件 ⇄ 全体」切替スイッチ
//   - current: "self"（個人ダッシュボード） or "all"（全体ページ）
//   - 自分のコードはログインセッションから取得。
//     未ログイン時は fallbackCode（表示中のダッシュボードの人）を使う
// ============================================================

export const ViewScopeSwitch = ({ current, fallbackCode = null }) => {
  const params = useParams();
  const [myCode, setMyCode] = useState(fallbackCode);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((me) => {
        if (me.user && me.user.code) setMyCode(me.user.code);
      })
      .catch(() => {});
  }, []);

  const base = `/${params.secretPath}`;
  const btn = (active) =>
    `flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
      active
        ? "bg-white text-gray-900 shadow-sm"
        : "text-gray-500 hover:text-gray-700"
    }`;

  return (
    <div className="inline-flex items-center bg-gray-100 rounded-lg p-1">
      {myCode && (
        <a href={`${base}/dashboard/${myCode}`} className={btn(current === "self")}>
          <User className="h-3.5 w-3.5" />
          自分の案件
        </a>
      )}
      <a href={`${base}/all-project`} className={btn(current === "all")}>
        <Users className="h-3.5 w-3.5" />
        全体
      </a>
    </div>
  );
};
