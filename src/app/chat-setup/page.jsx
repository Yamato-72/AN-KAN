"use client";

import { useEffect, useState } from "react";

// ============================================================
// Chatスペースの自動作成：代行の設定（/chat-setup）
//   ① OAuthクライアントのID・シークレットを貼って保存
//   ② 「許可する」で一度だけGoogleの許可画面へ
// ============================================================

const PROJECT = "peak-trilogy-480008-c4";

export default function ChatSetupPage() {
  const [st, setSt] = useState(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [id, setId] = useState("");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    const r = await fetch("/api/chat/oauth/settings", { cache: "no-store" });
    const j = await r.json();
    if (!r.ok) return setErr(j.error || "読み込めませんでした");
    setSt(j);
  };
  useEffect(() => {
    const res = new URLSearchParams(location.search).get("result");
    if (res === "ok") setMsg("許可できました。これで受注済みのときにスペースが作られます。");
    else if (res) setErr(res);
    load();
  }, []);

  const save = async () => {
    setBusy(true); setErr(""); setMsg("");
    const r = await fetch("/api/chat/oauth/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: id, clientSecret: secret }),
    });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return setErr(j.error || "保存できませんでした");
    setSecret(""); setMsg("保存しました。次は「許可する」です。"); load();
  };
  const revoke = async () => {
    if (!confirm("許可を取り消しますか？（取り消すと、スペースの自動作成が止まります）")) return;
    await fetch("/api/chat/oauth/settings", { method: "DELETE" });
    setMsg("取り消しました。"); load();
  };

  const step1Done = !!(st?.clientId && st?.hasClientSecret);
  const step2Done = !!st?.authorized;

  return (
    <div className="min-h-screen bg-[#f4f1ea] px-4 py-10">
      <div className="mx-auto max-w-xl">
        <p className="text-xs tracking-[0.2em] text-[#8a8170]">AN-KAN 設定</p>
        <h1 className="mt-1 text-2xl font-bold text-[#1f2a37]">Chatスペースの自動作成</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#5b5446]">
          受注済みになった案件のスペースを、AN-KANが <b>許可した人の代わりに</b> 作ります。設定は最初の一度だけです。
        </p>

        {err && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>}
        {msg && <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{msg}</div>}

        {/* 状態 */}
        <div className="mt-6 flex gap-2">
          <Pill done={step1Done} label="① 鍵の登録" />
          <Pill done={step2Done} label="② 許可" />
        </div>

        {/* ① */}
        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <h2 className="font-bold text-[#1f2a37]">① 鍵（OAuthクライアント）を登録</h2>
          {step1Done ? (
            <p className="mt-2 text-sm text-[#5b5446]">登録済み：<span className="font-mono text-xs">{st.clientId}</span></p>
          ) : null}
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-[#5b5446]">
            <li>
              <a className="text-[#2563eb] underline" target="_blank" rel="noreferrer"
                href={`https://console.cloud.google.com/auth/clients/create?project=${PROJECT}`}>
                Google Cloud のクライアント作成画面
              </a>
              を開く
            </li>
            <li>種類は「ウェブ アプリケーション」、名前は「AN-KAN Chat代行」</li>
            <li>
              「承認済みのリダイレクト URI」に次をそのまま貼る
              <div className="mt-1.5 flex items-center gap-2">
                <code className="flex-1 break-all rounded-lg bg-[#f4f1ea] px-2.5 py-1.5 text-xs">{st?.redirectUri || "…"}</code>
                <button
                  onClick={() => { navigator.clipboard.writeText(st?.redirectUri || ""); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                  className="shrink-0 rounded-lg border border-[#d9d2c3] px-2.5 py-1.5 text-xs hover:bg-[#f4f1ea]">
                  {copied ? "コピーしました" : "コピー"}
                </button>
              </div>
            </li>
            <li>「作成」を押して出てくる <b>クライアントID</b> と <b>シークレット</b> を下に貼る</li>
          </ol>
          <div className="mt-4 space-y-2.5">
            <input value={id} onChange={(e) => setId(e.target.value)} placeholder="クライアントID（…apps.googleusercontent.com）"
              autoComplete="off" className="w-full rounded-xl border border-[#d9d2c3] px-3 py-2.5 text-sm outline-none focus:border-[#1f2a37]" />
            <input value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="クライアント シークレット" type="password"
              autoComplete="off" className="w-full rounded-xl border border-[#d9d2c3] px-3 py-2.5 text-sm outline-none focus:border-[#1f2a37]" />
            <button disabled={busy || !id || !secret} onClick={save}
              className="w-full rounded-xl bg-[#1f2a37] py-2.5 text-sm font-bold text-white transition hover:bg-[#111827] disabled:opacity-40">
              {step1Done ? "登録し直す" : "保存する"}
            </button>
          </div>
        </section>

        {/* ② */}
        <section className={`mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 ${step1Done ? "" : "opacity-50"}`}>
          <h2 className="font-bold text-[#1f2a37]">② スペース作成を許可</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#5b5446]">
            Googleの画面で、スペースを作る・メンバーを入れる許可を出します。作られたスペースの作成者は、許可した人になります。
          </p>
          {step2Done ? (
            <div className="mt-3 flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <span>許可済み：{st.email}</span>
              <button onClick={revoke} className="text-xs text-emerald-700 underline">取り消す</button>
            </div>
          ) : null}
          <a href={step1Done ? "/api/chat/oauth/start" : undefined}
            className={`mt-3 block w-full rounded-xl py-2.5 text-center text-sm font-bold ${step1Done ? "bg-[#c2410c] text-white hover:bg-[#9a3412]" : "pointer-events-none bg-[#e7e1d5] text-[#8a8170]"}`}>
            {step2Done ? "許可し直す" : "許可する"}
          </a>
        </section>
      </div>
    </div>
  );
}

function Pill({ done, label }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${done ? "bg-emerald-100 text-emerald-800" : "bg-[#e7e1d5] text-[#8a8170]"}`}>
      {done ? "✓ " : ""}{label}
    </span>
  );
}
