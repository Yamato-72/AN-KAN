import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/authz";

// ============================================================
// メンバー管理（管理者専用・見学モードでもログイン必須）
//   GET   : 全メンバー一覧（無効化した人も含む）
//   POST  : 新規追加 { code, name, email }
//   PATCH : 更新 { id, name?, email?, active?, is_admin?, passer? }
// ============================================================

export async function GET(request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    const { rows } = await query(
      `SELECT id, code, name, email, active, passer, COALESCE(is_admin, false) AS is_admin, COALESCE(all_view, false) AS all_view
       FROM staff_members ORDER BY code`,
    );
    return NextResponse.json(rows);
  } catch (error) {
    console.error("メンバー一覧エラー:", error);
    return NextResponse.json({ error: "一覧の取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    const { code, name, email } = await request.json();

    if (!code || !/^[A-Z]$/.test(code)) {
      return NextResponse.json(
        { error: "担当コードはA〜Zの1文字で指定してください" },
        { status: 400 },
      );
    }
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "名前は必須です" }, { status: 400 });
    }

    // コードの重複チェック
    const dup = await query(`SELECT id FROM staff_members WHERE code = $1`, [code]);
    if (dup.rows.length > 0) {
      return NextResponse.json(
        { error: `コード ${code} はすでに使われています` },
        { status: 409 },
      );
    }

    const { rows } = await query(
      `INSERT INTO staff_members (code, name, email, active, is_admin)
       VALUES ($1, $2, $3, true, false)
       RETURNING id, code, name, email, active, passer, COALESCE(is_admin,false) AS is_admin, COALESCE(all_view,false) AS all_view`,
      [code, name.trim(), email ? email.trim().toLowerCase() : null],
    );
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("メンバー追加エラー:", error);
    return NextResponse.json({ error: "追加に失敗しました" }, { status: 500 });
  }
}

export async function PATCH(request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    const { id, name, email, active, is_admin, passer, all_view } = await request.json();
    if (!id) return NextResponse.json({ error: "idは必須です" }, { status: 400 });

    const { rows } = await query(
      `UPDATE staff_members SET
         name = COALESCE($2, name),
         email = COALESCE($3, email),
         active = COALESCE($4, active),
         is_admin = COALESCE($5, is_admin),
         passer = COALESCE($6, passer),
         all_view = COALESCE($7, all_view)
       WHERE id = $1
       RETURNING id, code, name, email, active, passer, COALESCE(is_admin,false) AS is_admin, COALESCE(all_view,false) AS all_view`,
      [
        id,
        name === undefined ? null : name,
        email === undefined ? null : (email ? email.trim().toLowerCase() : ""),
        active === undefined ? null : active,
        is_admin === undefined ? null : is_admin,
        passer === undefined ? null : passer,
        all_view === undefined ? null : all_view,
      ],
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: "対象が見つかりません" }, { status: 404 });
    }
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("メンバー更新エラー:", error);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}
