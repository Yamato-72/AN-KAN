// apps/web/src/app/api/staff/route.js
import { NextResponse } from "next/server";
import { query } from "@/lib/db"; // ★ Neon じゃなくて pg 用ヘルパー

export async function GET() {
  try {
    const { rows } = await query(
      `
      SELECT
        id,
        code,
        name,
        email,
        active,
        passer
      FROM staff_members
      WHERE active = true
      ORDER BY id
      `
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching staff:", error);
    return NextResponse.json(
      { error: "Failed to fetch staff" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email } = body;

    if (!name) {
      return NextResponse.json(
        { error: "名前は必須です" },
        { status: 400 }
      );
    }

    const { rows } = await query(
      `
      INSERT INTO staff_members (name, email, active)
      VALUES ($1, $2, true)
      RETURNING id, code, name, email, active, passer
      `,
      [name, email || null]
    );

    // pg の query() は { rows: [...] } なので 0番目を返す
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("Error creating staff member:", error);
    return NextResponse.json(
      { error: "担当者の作成に失敗しました" },
      { status: 500 }
    );
  }
}


