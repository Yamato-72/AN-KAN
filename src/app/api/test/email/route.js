import { sendEmail } from "@/app/api/utils/send-email";

export async function POST(request) {
  try {
    const body = await request.json();
    const { testEmail } = body;

    if (!testEmail) {
      return Response.json(
        { error: "テストメールアドレスが必要です" },
        { status: 400 },
      );
    }

    console.log("=== テストメール送信開始 ===");
    console.log("宛先:", testEmail);
    console.log("環境変数チェック:");
    console.log(
      "- GMAIL_USER:",
      process.env.GMAIL_USER ? "設定済み" : "未設定",
    );
    console.log(
      "- GMAIL_APP_PASSWORD:",
      process.env.GMAIL_APP_PASSWORD ? "設定済み" : "未設定",
    );

    const result = await sendEmail({
      to: testEmail,
      subject: "テストメール - Digital Signage Management System",
      html: `
        <h2>テストメール送信成功</h2>
        <p>このメールは、Digital Signage Management Systemからのテストメールです。</p>
        <p>メール送信機能が正常に動作しています。</p>
        <hr>
        <p><small>送信時刻: ${new Date().toLocaleString("ja-JP")}</small></p>
      `,
    });

    if (result.success) {
      console.log("✅ テストメール送信成功");
      return Response.json({
        success: true,
        message: "テストメールを送信しました",
        messageId: result.messageId,
      });
    } else {
      console.error("❌ テストメール送信失敗:", result.error);
      return Response.json(
        {
          success: false,
          error: "メール送信に失敗しました",
          details: result.error,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("❌ テストメール送信エラー:", error);
    return Response.json(
      {
        success: false,
        error: "メール送信処理中にエラーが発生しました",
        details: error.message,
      },
      { status: 500 },
    );
  }
}



