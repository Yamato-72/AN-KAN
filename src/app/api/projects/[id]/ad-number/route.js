import sql from "@/app/api/utils/sql";
import { normalizePrefix } from "@/lib/prefixes";

// ============================================================
// 案件番号(prefix + ad_number)を変更する専用窓口
//   - 既存の更新APIとは別に、ここで「重複チェック」を必ず通す
//   - 「接頭辞 + 番号」の組で他案件と衝突していたら変更を止める（事故防止）
//   - 接頭辞(prefix)も一緒に変えられる。未指定なら今の接頭辞のまま
//   - 変更内容はアクティビティログに残す
// ============================================================

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();

    // 受け取った新番号を整数に正規化（"AD-0123" でも "123" でも拾う）
    const raw = body.ad_number ?? body.new_ad_number;
    const matched = raw !== undefined && raw !== null ? String(raw).match(/(\d+)\s*$/) : null;
    const newAdNumber = matched ? parseInt(matched[1], 10) : NaN;

    if (Number.isNaN(newAdNumber) || newAdNumber <= 0) {
      return Response.json(
        { error: "案件番号が正しくありません（正の整数で指定してください）", received: raw },
        { status: 400 },
      );
    }

    // 対象の案件を取得（現在の接頭辞も一緒に）
    const target = await sql`
      SELECT id, prefix, ad_number FROM projects WHERE id = ${id}
    `;
    if (target.length === 0) {
      return Response.json({ error: "案件が見つかりません" }, { status: 404 });
    }

    const current = target[0];
    const oldPrefix = current.prefix || "AD";
    const oldAdNumber = current.ad_number;

    // 新しい接頭辞：body.prefix が来ていればそれ、なければ今の接頭辞を維持
    const newPrefix = body.prefix !== undefined && body.prefix !== null
      ? normalizePrefix(body.prefix)
      : oldPrefix;

    // 接頭辞も番号も変わっていなければそのまま返す
    if (oldPrefix === newPrefix && Number(oldAdNumber) === newAdNumber) {
      return Response.json(
        { message: "番号は変わっていません", prefix: newPrefix, ad_number: newAdNumber },
        { status: 200 },
      );
    }

    // 重複チェック：他の案件が同じ「接頭辞 + 番号」を使っていないか
    const duplicate = await sql`
      SELECT id FROM projects
      WHERE prefix = ${newPrefix} AND ad_number = ${newAdNumber} AND id <> ${id}
    `;
    if (duplicate.length > 0) {
      return Response.json(
        {
          error: `案件番号 ${newPrefix}-${newAdNumber} は、すでに別の案件で使われています`,
          conflictProjectId: duplicate[0].id,
        },
        { status: 409 },
      );
    }

    // 変更を実行
    const updated = await sql`
      UPDATE projects
      SET prefix = ${newPrefix},
          ad_number = ${newAdNumber},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    // ログに記録
    const oldLabel = `${oldPrefix}-${oldAdNumber ?? "未設定"}`;
    const newLabel = `${newPrefix}-${newAdNumber}`;
    await sql`
      INSERT INTO project_activities (project_id, activity_type, description)
      VALUES (${id}, 'update', ${`案件番号を変更（${oldLabel} → ${newLabel}）`})
    `;

    return Response.json(
      {
        message: "案件番号を変更しました",
        oldPrefix,
        oldAdNumber,
        newPrefix,
        newAdNumber,
        project: updated[0],
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("ad-number 変更エラー:", error);
    return Response.json({ error: "案件番号の変更に失敗しました" }, { status: 500 });
  }
}
