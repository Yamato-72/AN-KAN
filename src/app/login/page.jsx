"use client";

import { useEffect, useState } from "react";
import { GOOGLE_CLIENT_ID, ALLOWED_DOMAIN } from "@/lib/authConfig";

// ============================================================
// ログイン画面（/login）
//   - Googleの公式ログインボタンを表示
//   - 成功したら元居たページ（?next=...）へ戻す
// ============================================================

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Googleのログイン部品を読み込んでボタンを描画
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      if (!window.google) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        hosted_domain: ALLOWED_DOMAIN,
        callback: handleCredential,
      });
      window.google.accounts.id.renderButton(
        document.getElementById("googleBtn"),
        { theme: "outline", size: "large", text: "signin_with", width: 280 },
      );
    };
    document.body.appendChild(script);
  }, []);

  async function handleCredential(response) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ログインに失敗しました");

      // 元居たページへ（無ければトップ）
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next");
      window.location.href = next && next.startsWith("/") ? next : "/";
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-gray-200 p-8 w-full max-w-sm text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-3 h-3 bg-[#D6001C] rounded-sm" />
          <h1 className="text-lg font-bold text-gray-800">AN-KAN</h1>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          会社のGoogleアカウントでログインしてください
        </p>
        <div className="flex justify-center" id="googleBtn" />
        {loading && (
          <p className="text-sm text-gray-400 mt-4">確認しています...</p>
        )}
        {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
        <p className="text-[11px] text-gray-400 mt-6">
          @{ALLOWED_DOMAIN} のアカウントのみ利用できます
        </p>
      </div>
    </div>
  );
}
