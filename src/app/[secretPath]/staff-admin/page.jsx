"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { UserPlus, Save, ArrowLeft } from "lucide-react";

// ============================================================
// メンバー管理ページ（管理者専用）
//   - 一覧・追加・編集（名前/メール）・切替（管理者/有効/Pass権限）
//   - 退職は「無効化」で対応（過去案件の担当履歴を守るため削除はしない）
// ============================================================

export default function StaffAdminPage() {
  const params = useParams();
  const [me, setMe] = useState(undefined); // undefined=確認中, null=権限なし
  const [staff, setStaff] = useState([]);
  const [msg, setMsg] = useState("");
  // 追加フォーム
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user && d.user.isAdmin) {
          setMe(d.user);
          loadStaff();
        } else setMe(null);
      })
      .catch(() => setMe(null));
  }, []);

  const loadStaff = async () => {
    const res = await fetch("/api/staff/admin");
    if (res.ok) {
      const rows = await res.json();
      setStaff(rows);
      // 空きコードを自動提案
      const used = new Set(rows.map((s) => s.code));
      for (const c of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
        if (!used.has(c)) { setNewCode(c); break; }
      }
    }
  };

  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(""), 3000); };

  const addStaff = async () => {
    const res = await fetch("/api/staff/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: newCode, name: newName, email: newEmail }),
    });
    const d = await res.json();
    if (!res.ok) return flash(`❌ ${d.error}`);
    flash(`✅ ${d.code}：${d.name} を追加しました`);
    setNewName(""); setNewEmail("");
    loadStaff();
  };

  const updateStaff = async (id, patch, label) => {
    const res = await fetch("/api/staff/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    const d = await res.json();
    if (!res.ok) return flash(`❌ ${d.error}`);
    flash(`✅ ${label}`);
    setStaff((prev) => prev.map((s) => (s.id === id ? d : s)));
  };

  const editField = (id, field, value) => {
    setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  if (me === undefined) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 text-sm">確認中...</div>;
  }
  if (me === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-gray-700 font-semibold mb-1">管理者専用ページです</p>
          <p className="text-sm text-gray-500">管理者アカウントでログインしてください</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <a href={`/${params.secretPath}/dashboard/${me.code || ""}`} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </a>
          <h1 className="text-xl font-bold text-gray-800">メンバー管理</h1>
          {msg && <span className="text-sm ml-auto">{msg}</span>}
        </div>

        {/* 追加フォーム */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5">
          <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <UserPlus className="h-4 w-4" /> 新しいメンバーを追加
          </p>
          <div className="flex flex-wrap gap-2">
            <input value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              maxLength={1} placeholder="コード"
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm text-center font-mono" />
            <input value={newName} onChange={(e) => setNewName(e.target.value)}
              placeholder="名前（必須）"
              className="flex-1 min-w-[140px] px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
              placeholder="メール（あればログイン直行が有効に）"
              className="flex-1 min-w-[220px] px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <button onClick={addStaff} disabled={!newName.trim()}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 disabled:opacity-40">
              追加
            </button>
          </div>
        </div>

        {/* 一覧 */}
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {staff.map((s) => (
            <div key={s.id} className={`p-4 ${s.active ? "" : "opacity-50 bg-gray-50"}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center flex-none">
                  {s.code || "?"}
                </span>
                <input value={s.name || ""} onChange={(e) => editField(s.id, "name", e.target.value)}
                  className="w-32 px-2 py-1.5 border border-gray-200 rounded text-sm font-medium" />
                <input value={s.email || ""} onChange={(e) => editField(s.id, "email", e.target.value)}
                  placeholder="メール未登録"
                  className="flex-1 min-w-[200px] px-2 py-1.5 border border-gray-200 rounded text-sm text-gray-600" />
                <button
                  onClick={() => updateStaff(s.id, { name: s.name, email: s.email }, `${s.name} を保存しました`)}
                  className="p-1.5 text-gray-400 hover:text-blue-600" title="名前・メールを保存">
                  <Save className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-4 mt-2 ml-10 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={s.is_admin}
                    onChange={(e) => updateStaff(s.id, { is_admin: e.target.checked }, `${s.name} の管理者を${e.target.checked ? "ON" : "OFF"}にしました`)} />
                  管理者
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={s.passer}
                    onChange={(e) => updateStaff(s.id, { passer: e.target.checked }, `${s.name} のPass権限を${e.target.checked ? "ON" : "OFF"}にしました`)} />
                  Pass権限
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={s.active}
                    onChange={(e) => updateStaff(s.id, { active: e.target.checked }, `${s.name} を${e.target.checked ? "有効化" : "無効化"}しました`)} />
                  有効
                </label>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-400 mt-4 leading-relaxed">
          ※ 退職時は削除ではなく「有効」を外してください（過去案件の担当履歴が保たれます）。<br />
          ※ 管理者の変更は、本人が次にログインし直したときに反映されます。
        </p>
      </div>
    </div>
  );
}
