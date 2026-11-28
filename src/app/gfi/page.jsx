// src/app/gfi/page.jsx
// GFI様専用ダッシュボードは使わなくなったので閉じた（2026-11-28）。開くと「見つかりません」になる。
// 元の画面は GfiClientPage.jsx に残してある（戻すときはこのファイルで呼び出す）。
import { notFound } from "next/navigation";

export default function Page() {
  notFound();
}
