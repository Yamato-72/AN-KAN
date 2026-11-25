// ============================================================
// Google Chat「AN-KAN」アプリの受け口
//   - AN-KANは通知専用のアプリ。話しかけられたときに短く返事をするだけ
//   - スペースに追加されたときは何も投稿しない（自動追加スクリプトで多数のスペースに入るため、あいさつで騒がしくしない）
//   - Chat API の「構成」→ 接続設定 の HTTP エンドポイント URL にこのURLを登録する
//       https://<AN-KANのURL>/api/chat/events
//   - 従来のChatアプリ形式（event.type）と、Google Workspace アドオン形式（event.chat.*）の両方に対応
// ============================================================

const MESSAGE_TEXT = "AN-KANは通知専用のアプリです。案件の内容はAN-KANの画面で確認してください。";

export async function POST(request) {
  const event = await request.json().catch(() => ({}));

  // Google Workspace アドオン形式
  if (event.chat) {
    let text = "";
    if (event.chat.messagePayload) text = MESSAGE_TEXT;
    if (!text) return Response.json({});
    return Response.json({
      hostAppDataAction: { chatDataAction: { createMessageAction: { message: { text } } } },
    });
  }

  // 従来のChatアプリ形式
  if (event.type === "MESSAGE") return Response.json({ text: MESSAGE_TEXT });
  return Response.json({});
}
