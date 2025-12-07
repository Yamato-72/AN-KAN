import sql from "@/app/api/utils/sql";

// ステータスの順序を定義
const STATUS_ORDER = [
  "打ち合わせ中",
  "受注済み",
  "国際発注済",
  "設置手配済",
  "設置完了",
  "残金請求済",
];

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { action, confirm, installationData, revenue, deliveryDate } = body; // deliveryDateを追加

    // 現在のプロジェクト情報を取得
    const project = await sql`
      SELECT * FROM projects WHERE id = ${id}
    `;

    if (project.length === 0) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    const currentStatus = project[0].status;
    const currentIndex = STATUS_ORDER.indexOf(currentStatus);

    let newStatus;
    let newIndex;

    if (action === "next") {
      // 次のステータスに進む
      newIndex = Math.min(currentIndex + 1, STATUS_ORDER.length - 1);
    } else if (action === "previous") {
      // 前のステータスに戻る
      newIndex = Math.max(currentIndex - 1, 0);
    } else {
      return Response.json({ error: "Invalid action" }, { status: 400 });
    }

    newStatus = STATUS_ORDER[newIndex];

    // ステータスが変更されない場合はそのまま返す
    if (newStatus === currentStatus) {
      return Response.json({
        message: "ステータスは既に最新の状態です",
        project: project[0],
      });
    }

    // 設置手配済への更新時は設置情報のバリデーション
    if (newStatus === "設置手配済" && currentStatus === "国際発注済") {
      if (
        !installationData ||
        !installationData.installation_contractor ||
        !installationData.installation_contractor.trim() ||
        !installationData.installation_date
      ) {
        return Response.json(
          {
            error: "設置業者と設置日の両方を入力してください",
          },
          { status: 400 },
        );
      }
    }

    // 確認が必要な場合のチェック（confirmフラグがfalseまたは未設定の場合のみ）
    if (!confirm) {
      const canUpdateStatus = await checkStatusUpdateConditions(
        project[0],
        newStatus,
      );

      if (!canUpdateStatus.allowed) {
        return Response.json(
          {
            error:
              canUpdateStatus.reason ||
              "ステータス更新の条件が満たされていません",
          },
          { status: 400 },
        );
      }

      // 設置情報入力が必要な場合
      if (canUpdateStatus.requiresInstallationInfo) {
        return Response.json({
          requiresInstallationInfo: true,
          currentInstallationContractor:
            canUpdateStatus.currentInstallationContractor,
          currentInstallationDate: canUpdateStatus.currentInstallationDate,
          project: project[0],
          newStatus: newStatus,
        });
      }

      // 確認が必要な場合は確認メッセージを返す
      if (canUpdateStatus.requiresConfirmation) {
        return Response.json({
          requiresConfirmation: true,
          confirmationMessage: canUpdateStatus.confirmationMessage,
          project: project[0],
          newStatus: newStatus,
        });
      }
    }

    // データベース更新のクエリを構築
    let updateQuery;

    if (
      installationData &&
      revenue !== undefined &&
      deliveryDate !== undefined
    ) {
      // 設置情報、売上高、納期の全てがある場合
      updateQuery = sql`
        UPDATE projects 
        SET status = ${newStatus}, 
            installation_contractor = ${installationData.installation_contractor || null},
            installation_date = ${installationData.installation_date || null},
            revenue = ${revenue || null},
            delivery_date = ${deliveryDate || null},
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
    } else if (installationData && deliveryDate !== undefined) {
      // 設置情報と納期
      updateQuery = sql`
        UPDATE projects 
        SET status = ${newStatus}, 
            installation_contractor = ${installationData.installation_contractor || null},
            installation_date = ${installationData.installation_date || null},
            delivery_date = ${deliveryDate || null},
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
    } else if (revenue !== undefined && deliveryDate !== undefined) {
      // 売上高と納期
      updateQuery = sql`
        UPDATE projects 
        SET status = ${newStatus}, 
            revenue = ${revenue || null},
            delivery_date = ${deliveryDate || null},
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
    } else if (installationData && revenue !== undefined) {
      // 設置情報と売上高の両方がある場合
      updateQuery = sql`
        UPDATE projects 
        SET status = ${newStatus}, 
            installation_contractor = ${installationData.installation_contractor || null},
            installation_date = ${installationData.installation_date || null},
            revenue = ${revenue || null},
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
    } else if (installationData) {
      // 設置情報のみ
      updateQuery = sql`
        UPDATE projects 
        SET status = ${newStatus}, 
            installation_contractor = ${installationData.installation_contractor || null},
            installation_date = ${installationData.installation_date || null},
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
    } else if (revenue !== undefined) {
      // 売上高のみ
      updateQuery = sql`
        UPDATE projects 
        SET status = ${newStatus}, 
            revenue = ${revenue || null},
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
    } else if (deliveryDate !== undefined) {
      // 納期のみ
      updateQuery = sql`
        UPDATE projects 
        SET status = ${newStatus}, 
            delivery_date = ${deliveryDate || null},
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
    } else {
      // ステータスのみ
      updateQuery = sql`
        UPDATE projects 
        SET status = ${newStatus}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
    }

    const updatedProject = await updateQuery;

    // アクティビティログを追加
    let activityDescription = `ステータスが「${currentStatus}」から「${newStatus}」に変更されました`;

    if (installationData) {
      if (installationData.installation_contractor) {
        activityDescription += `（設置業者: ${installationData.installation_contractor}）`;
      }
      if (installationData.installation_date) {
        const dateStr = new Date(
          installationData.installation_date,
        ).toLocaleDateString("ja-JP");
        activityDescription += `（設置日: ${dateStr}）`;
      }
    }

    if (revenue !== undefined && revenue !== null && revenue !== "") {
      const formattedRevenue = new Intl.NumberFormat("ja-JP").format(revenue);
      activityDescription += `（売上高: ${formattedRevenue}円）`;
    }

    if (
      deliveryDate !== undefined &&
      deliveryDate !== null &&
      deliveryDate !== ""
    ) {
      const dateStr = new Date(deliveryDate).toLocaleDateString("ja-JP");
      activityDescription += `（納期: ${dateStr}）`;
    }

    await sql`
      INSERT INTO project_activities (project_id, activity_type, description)
      VALUES (${id}, 'status_update', ${activityDescription})
    `;

    // 残金請求済に変更された場合は特別なメッセージ
    let responseMessage = `ステータスが「${newStatus}」に更新されました`;
    if (newStatus === "残金請求済") {
      responseMessage = "プロジェクトを完了しました。お疲れ様でした！";
    }

    return Response.json({
      message: responseMessage,
      project: updatedProject[0],
    });
  } catch (error) {
    console.error("Error updating project status:", error);
    return Response.json(
      { error: "Failed to update project status" },
      { status: 500 },
    );
  }
}

// ステータス更新の条件をチェックする関数（将来の拡張用）
async function checkStatusUpdateConditions(project, newStatus) {
  // TODO: ここで各ステータスの更新条件をチェック
  // 例：
  // - '受注済み' に進むには契約書が必要
  // - '設置完了' に進むには設置完了報告書が必要
  // - など

  switch (newStatus) {
    case "受注済み":
      // 打ち合わせ中から受注済みに進む場合は納期入力のモーダルで処理
      if (project.status === "打ち合わせ中") {
        return {
          allowed: true,
          requiresConfirmation: false,
        };
      }
      break;
    case "国際発注済":
      // 受注済みから国際発注済みに進む場合は納期を表示して確認
      if (project.status === "受注済み") {
        const deliveryDateText = project.delivery_date
          ? new Date(project.delivery_date).toLocaleDateString("ja-JP", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : "未設定";

        return {
          allowed: true,
          requiresConfirmation: true,
          confirmationMessage: `納期は${deliveryDateText}です。国際発注を行いますか？`,
        };
      }
      break;
    case "設置手配済":
      // 国際発注済みから設置手配済みに進む場合は設置情報の入力が必要
      if (project.status === "国際発注済") {
        return {
          allowed: true,
          requiresInstallationInfo: true,
          currentInstallationContractor: project.installation_contractor || "",
          currentInstallationDate: project.installation_date || "",
        };
      }
      break;
    case "設置完了":
      // 設置手配済みから設置完了に進む場合は設置予定日のチェックが必要
      if (project.status === "設置手配済") {
        const today = new Date();
        const installationDate = project.installation_date
          ? new Date(project.installation_date)
          : null;

        if (!installationDate) {
          return {
            allowed: false,
            reason:
              "設置予定日が設定されていません。設置情報を確認してください。",
          };
        }

        // 日付のみで比較（時刻を無視）
        const todayDateOnly = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
        );
        const installationDateOnly = new Date(
          installationDate.getFullYear(),
          installationDate.getMonth(),
          installationDate.getDate(),
        );

        if (todayDateOnly < installationDateOnly) {
          // 設置予定日を過ぎていない場合
          const installationDateText = installationDate.toLocaleDateString(
            "ja-JP",
            {
              year: "numeric",
              month: "long",
              day: "numeric",
            },
          );

          return {
            allowed: false,
            reason: `設置予定日（${installationDateText}）を過ぎていません。`,
          };
        } else {
          // 設置予定日を過ぎている場合（当日も含む）
          const installationDateText = installationDate.toLocaleDateString(
            "ja-JP",
            {
              year: "numeric",
              month: "long",
              day: "numeric",
            },
          );

          return {
            allowed: true,
            requiresConfirmation: true,
            confirmationMessage: `設置予定日は${installationDateText}です。設置完了としてステータスを更新しますか？`,
          };
        }
      }
      break;
    case "残金請求済":
      // 設置完了から残金請求済に進む場合は確認のみ
      if (project.status === "設置完了") {
        return {
          allowed: true,
          requiresConfirmation: true,
          confirmationMessage: "ステータスを「残金請求済」に更新しますか？",
        };
      }
      break;
    default:
      break;
  }

  // デフォルトは許可（確認不要）
  return { allowed: true, requiresConfirmation: false };
}



