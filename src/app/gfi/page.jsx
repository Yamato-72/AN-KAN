// src/app/gfi/page.jsx

// ★ここでは "use client" を絶対に書かない！！

// ページタイトル用 metadata（ここはサーバーコンポーネントなのでOK）
export const metadata = {
  title: "GFI様専用ページ",
};

import GfiClientPage from "./GfiClientPage";

export default function Page() {
  // ここではクライアントコンポーネントを呼び出すだけ
  return <GfiClientPage />;
}
