import sql from "@/app/api/utils/sql";
import { sendEmail } from "@/app/api/utils/send-email";

export async function PATCH(request, { params }) {
  try {
    console.log("GFI PATCH request received for project:", params.id);
    const { id } = params;
    const body = await request.json();
    const { gfi } = body;

    console.log("GFI flag value:", gfi);

    if (typeof gfi !== "boolean") {
      return Response.json(
        { error: "gfi field must be a boolean value" },
        { status: 400 },
      );
    }

    // Update the gfi flag
    console.log("Updating GFI flag in database...");
    const result = await sql`
      UPDATE projects 
      SET gfi = ${gfi}, updated_at = NOW()
      WHERE id = ${parseInt(id)}
      RETURNING *
    `;

    if (result.length === 0) {
      console.log("Project not found:", id);
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    const project = result[0];
    console.log(
      "GFI flag updated successfully for project:",
      project.project_name,
    );

    // Add activity log
    await sql`
      INSERT INTO project_activities (project_id, activity_type, description)
      VALUES (
        ${parseInt(id)},
        'gfi_updated',
        ${gfi ? "GFIフラグが設定されました" : "GFIフラグが解除されました"}
      )
    `;
    console.log("Activity log added");

    // GFIフラグがONに設定された場合、メール通知を送信
    if (gfi) {
      console.log("GFI flag is ON, preparing email notification...");
      try {
        // プロジェクトの詳細情報を取得
        const projectDetails = await sql`
          SELECT 
            p.*
          FROM projects p
          WHERE p.id = ${parseInt(id)}
        `;

        const projectDetail = projectDetails[0];
        console.log(
          "Project details retrieved for email:",
          projectDetail.project_name,
        );

        // メール本文を作成
        const emailSubject = `GFIフラグ設定通知: ${projectDetail.project_name}`;

        const emailHtml = `
          <h2>GFIフラグが設定されました</h2>
          <p>以下のプロジェクトにGFIフラグが設定されました:</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #dee2e6;">
                <td style="padding: 8px 0; font-weight: bold; width: 150px;">プロジェクト名</td>
                <td style="padding: 8px 0;">${projectDetail.project_name}</td>
              </tr>
              ${
                projectDetail.ad_number
                  ? `
              <tr style="border-bottom: 1px solid #dee2e6;">
                <td style="padding: 8px 0; font-weight: bold;">AD番号</td>
                <td style="padding: 8px 0;">AD-${projectDetail.ad_number}</td>
              </tr>
              `
                  : ""
              }
              ${
                projectDetail.address
                  ? `
              <tr style="border-bottom: 1px solid #dee2e6;">
                <td style="padding: 8px 0; font-weight: bold;">設置先住所</td>
                <td style="padding: 8px 0;">${projectDetail.address}</td>
              </tr>
              `
                  : ""
              }
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">ステータス</td>
                <td style="padding: 8px 0;">${projectDetail.status}</td>
              </tr>
            </table>
          </div>
          
          <p>このプロジェクトがGFI様専用ページに表示されるようになりました。</p>
          
          <hr style="margin: 20px 0;">
          <p style="color: #6c757d; font-size: 14px;">
            この通知は自動送信されています。<br>
            プロジェクト管理システムより
          </p>
        `;

        const emailText = `
GFIフラグが設定されました

プロジェクト名: ${projectDetail.project_name}
${projectDetail.ad_number ? `AD番号: AD-${projectDetail.ad_number}` : ""}
${projectDetail.address ? `設置先住所: ${projectDetail.address}` : ""}
ステータス: ${projectDetail.status}

このプロジェクトがGFI様専用ページに表示されるようになりました。

この通知は自動送信されています。
プロジェクト管理システムより
        `;

        const emailTo =
          process.env.GFI_NOTIFICATION_EMAIL || "gfi-notifications@example.com";
        console.log("Sending email to:", emailTo);
        console.log("Email subject:", emailSubject);

        // メール送信（送信先は環境変数で設定）
        await sendEmail({
          to: emailTo,
          subject: emailSubject,
          html: emailHtml,
          text: emailText,
        });

        console.log(
          `✅ GFI notification email sent successfully for project ${id}`,
        );
      } catch (emailError) {
        console.error("❌ Failed to send GFI notification email:", emailError);
        console.error("Email error details:", emailError.message);
        // メール送信エラーはプロジェクト更新の成功を妨げない
      }
    } else {
      console.log("GFI flag is OFF, no email notification needed");
    }

    return Response.json({
      project,
      message: gfi ? "GFIフラグを設定しました" : "GFIフラグを解除しました",
    });
  } catch (error) {
    console.error("❌ Error updating project GFI flag:", error);
    return Response.json(
      { error: "Failed to update GFI flag" },
      { status: 500 },
    );
  }
}



