// src/app/gfi/GfiClientPage.jsx
"use client";

import React from "react";
import { useGfiStats } from "@/hooks/useGfiStats";
// 他にも使ってるコンポーネント・hooksがあればここに import する

export default function GfiClientPage() {
  const { stats, isLoading, error } = useGfiStats();

  // ★ここに、今まで page.jsx に書いていた JSX をそのまま持ってくる
  // 例：
  return (
    <div>
      {/* GFI様ページのレイアウトとかカード、グラフなど */}
      {/* stats / isLoading / error を使った表示もここに書く */}
    </div>
  );
}
