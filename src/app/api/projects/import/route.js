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
      imported: [],
    };

    // 各行を処理
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const rowNumber = i + 1;

      try {
        // assigned_team_memberの処理：アルファベットコードをそのまま使用
        let assignedTeamMemberCode = null;
        if (row.assigned_team_member) {
          const assignedCode = row.assigned_team_member
            .toString()
            .trim()
            .toUpperCase();

          // アルファベットコードの場合、存在確認
          if (assignedCode.match(/^[A-Z]$/)) {
            const staffExists = await sql`
              SELECT code FROM staff_members WHERE code = ${assignedCode}
            `;
            if (staffExists.length > 0) {
              assignedTeamMemberCode = assignedCode;
            } else {
              // 存在しない担当者コードの場合、警告として記録するが処理は続行
              results.errors.push(
                `行 ${rowNumber}: 存在しない担当者コード "${assignedCode}" - 担当者なしで登録しました`,
              );
            }
          } else if (assignedCode) {
            // 無効な担当者コードの場合、警告として記録するが処理は続行
            results.errors.push(
              `行 ${rowNumber}: 無効な担当者コード "${assignedCode}" - 担当者なしで登録しました`,
            );
          }
        }

        // 必要なフィールドをマッピング
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
          assigned_team_member: assignedTeamMemberCode,
        };

        // ステータスの検証
        const validStatuses = [
          "打ち合わせ中",
          "受注済み",
          "国際発注済",
          "設置手配済",
          "設置完了",
          "残金請求済",
        ];
        if (projectData.status && !validStatuses.includes(projectData.status)) {
          // 無効なステータスの場合、デフォルトに変更して警告
          results.errors.push(
            `行 ${rowNumber}: 無効なステータス "${projectData.status}" - "打ち合わせ中"に変更しました`,
          );
          projectData.status = "打ち合わせ中";
        }

        // データベースに挿入
        const insertResult = await sql`
          INSERT INTO projects (
            ad_number, project_name, client_name, status, completion_percentage,
            delivery_date, installation_date, installation_contractor, remarks, assigned_team_member
          ) VALUES (
            ${projectData.ad_number}, ${projectData.project_name}, ${projectData.client_name}, 
            ${projectData.status}, ${projectData.completion_percentage}, ${projectData.delivery_date},
            ${projectData.installation_date}, ${projectData.installation_contractor}, 
            ${projectData.remarks}, ${projectData.assigned_team_member}
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



