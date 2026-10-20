import sql from "@/app/api/utils/sql.js";

export async function POST(request) {
  try {
    const body = await request.json();
    const { csvData } = body;

    if (!csvData || !Array.isArray(csvData) || csvData.length === 0) {
      return Response.json({ error: "CSVデータが無効です" }, { status: 400 });
    }

    const results = {
      success: 0,
      errors: [],
      warnings: [],
      imported: [],
    };

    // 顧客名の正規化：表記ゆれを吸収して同一顧客と判定するための変換
    //   （株）(株) → 株式会社 ／ （有）(有) → 有限会社 ／ 空白・全半角の差を無視
    const normalizeClientName = (name) =>
      String(name || "")
        .replace(/[（(]株[）)]/g, "株式会社")
        .replace(/[（(]有[）)]/g, "有限会社")
        .replace(/[\s\u3000]+/g, "") // 半角・全角スペース除去
        .trim();

    // 既存顧客を一度だけ読み込み、正規化名→(id, 正式名) の対応表を作る
    //   同じCSV内で表記ゆれがあっても、1人の顧客にまとまる
    const clientRows = await sql`SELECT id, client_name FROM clients`;
    const clientMap = new Map();
    clientRows.forEach((c) => {
      const key = normalizeClientName(c.client_name);
      if (key && !clientMap.has(key)) {
        clientMap.set(key, { id: c.id, name: c.client_name });
      }
    });

    // 各行を処理
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const rowNumber = i + 1;

      try {
        // assigned_team_memberの処理：コード（A〜Z）でも名前でも受け付ける
        //   例：「B」「大山」「大山将司」のどれでもOK。退職者も可（過去案件の記録用）
        let assignedTeamMemberCode = null;
        if (row.assigned_team_member) {
          const rawAssigned = row.assigned_team_member.toString().trim();
          const assignedCode = rawAssigned.toUpperCase();

          if (assignedCode.match(/^[A-Z]$/)) {
            // ① コード指定（1文字）
            const staffExists = await sql`
              SELECT code FROM staff_members WHERE code = ${assignedCode}
            `;
            if (staffExists.length > 0) {
              assignedTeamMemberCode = assignedCode;
            } else {
              results.warnings.push(
                `行 ${rowNumber}: 存在しない担当者コード "${assignedCode}" - 担当者なしで登録しました`,
              );
            }
          } else {
            // ② 名前指定：完全一致 → 部分一致の順で探す
            const byName = await sql`
              SELECT code, name FROM staff_members
              WHERE name = ${rawAssigned}
                 OR name LIKE ${"%" + rawAssigned + "%"}
              ORDER BY (name = ${rawAssigned}) DESC
            `;
            if (byName.length === 1 || (byName.length > 0 && byName[0].name === rawAssigned)) {
              assignedTeamMemberCode = byName[0].code;
            } else if (byName.length > 1) {
              results.warnings.push(
                `行 ${rowNumber}: 担当者名 "${rawAssigned}" に複数の候補があり特定できません - 担当者なしで登録しました`,
              );
            } else {
              results.warnings.push(
                `行 ${rowNumber}: 担当者 "${rawAssigned}" が見つかりません - 担当者なしで登録しました`,
              );
            }
          }
        }

        // 必要なフィールドをマッピング
        // 既存Driveフォルダのリンク（過去案件用・任意列）
        //   http(s)で始まるものだけ受け付け、それ以外は無視して警告
        let driveLink = (row.drive_folder_link || "").trim() || null;
        if (driveLink && !/^https?:\/\//.test(driveLink)) {
          results.warnings.push(
            `行 ${rowNumber}: drive_folder_linkがURL形式でないため無視しました（${driveLink}）`,
          );
          driveLink = null;
        }

        const projectData = {
          ad_number: parseInt(row.ad_number) || null,
          project_name:
            row.project_name || `プロジェクト ${row.ad_number || "New"}`,
          client_name: row.client_name || null,
          status: row.status || "打ち合わせ中",
          completion_percentage: parseInt(row.completion_percentage) || 0,
          delivery_date: row.delivery_date ? new Date(row.delivery_date) : null,
          installation_date: row.installation_date
            ? new Date(row.installation_date)
            : null,
          installation_contractor: row.installation_contractor || null,
          remarks: row.remarks || null,
          product_number: row.product_number || null, // 製品名・型番（自由記入）
          assigned_team_member: assignedTeamMemberCode,
        };

        // 売上（任意列）：数値のみ受け付け。変な値は警告して未設定扱い
        let revenueValue = null;
        if (row.revenue !== undefined && String(row.revenue).trim() !== "") {
          const r = parseFloat(String(row.revenue).replace(/[,¥￥\s]/g, ""));
          if (Number.isNaN(r) || r < 0) {
            results.warnings.push(
              `行 ${rowNumber}: 売上 "${row.revenue}" が数値として読めないため未設定にしました`,
            );
          } else {
            revenueValue = r;
          }
        }

        // ステータスの検証
        // 現行の5段階ステータス（DBのchk_projects_status制約と一致させること）
        const validStatuses = [
          "リード",
          "打ち合わせ中",
          "受注済み",
          "手配中",
          "残金請求済",
        ];
        if (projectData.status && !validStatuses.includes(projectData.status)) {
          // 無効なステータスの場合、デフォルトに変更して警告
          results.errors.push(
            `行 ${rowNumber}: 無効なステータス "${projectData.status}" - "打ち合わせ中"に変更しました`,
          );
          projectData.status = "打ち合わせ中";
        }

        // 重複チェック：同じAD番号が既に登録されていたらスキップ
        //（importはAD固定なので、接頭辞AD（未設定含む）の中で突き合わせる）
        if (projectData.ad_number) {
          const dup = await sql`
            SELECT id FROM projects
            WHERE COALESCE(prefix, 'AD') = 'AD' AND ad_number = ${projectData.ad_number}
            LIMIT 1
          `;
          if (dup.length > 0) {
            results.warnings.push(
              `行 ${rowNumber}: AD-${projectData.ad_number} は既に登録済みのためスキップしました`,
            );
            continue;
          }
        }

        // 顧客の紐付け：表記ゆれ（（株）⇔株式会社・空白差）を吸収して照合
        //   既存顧客が見つかれば流用し、案件の表示名も台帳の正式名に揃える
        let clientId = null;
        if (projectData.client_name) {
          const key = normalizeClientName(projectData.client_name);
          const hit = clientMap.get(key);
          if (hit) {
            clientId = hit.id;
            if (hit.name !== projectData.client_name) {
              results.warnings.push(
                `行 ${rowNumber}: 取引先「${projectData.client_name}」を既存の「${hit.name}」と同一とみなして紐付けました`,
              );
              projectData.client_name = hit.name; // 表示名を台帳の正式名に統一
            }
          } else {
            const newClient = await sql`
              INSERT INTO clients (client_name, company_address, phone_number, contact_person, email)
              VALUES (${projectData.client_name}, ${null}, ${null}, ${null}, ${null})
              RETURNING id
            `;
            clientId = newClient[0].id;
            clientMap.set(key, { id: clientId, name: projectData.client_name });
          }
        }

        // 登録・更新日時を案件の実日付に合わせる
        //（「今日取り込んだ＝更新日が今日」になると、更新日順の一覧で
        //   過去案件が先頭に湧いて皆の表示を乱すため。未来の納期は今日止まり）
        let historicalTs =
          projectData.delivery_date || projectData.installation_date || new Date();
        const nowTs = new Date();
        if (historicalTs > nowTs) historicalTs = nowTs;

        // データベースに挿入
        const insertResult = await sql`
          INSERT INTO projects (
            ad_number, project_name, client_name, client_id, status, completion_percentage,
            delivery_date, installation_date, installation_contractor, remarks, product_number,
            assigned_team_member, drive_folder_link, revenue, created_at, updated_at
          ) VALUES (
            ${projectData.ad_number}, ${projectData.project_name}, ${projectData.client_name}, ${clientId},
            ${projectData.status}, ${projectData.completion_percentage}, ${projectData.delivery_date},
            ${projectData.installation_date}, ${projectData.installation_contractor}, 
            ${projectData.remarks}, ${projectData.product_number}, ${projectData.assigned_team_member},
            ${driveLink}, ${revenueValue}, ${historicalTs}, ${historicalTs}
          ) RETURNING id, project_name
        `;

        results.success++;
        results.imported.push({
          id: insertResult[0].id,
          project_name:
            insertResult[0].project_name ||
            `プロジェクト ${insertResult[0].id}`,
          row: rowNumber,
        });
      } catch (error) {
        results.errors.push(`行 ${rowNumber}: ${error.message}`);
      }
    }

    return Response.json({
      message: `${results.success}件のプロジェクトをインポートしました`,
      results,
    });
  } catch (error) {
    console.error("CSV import error:", error);
    return Response.json(
      { error: "CSVインポート処理中にエラーが発生しました" },
      { status: 500 },
    );
  }
}



