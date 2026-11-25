// ============================================================
// Google Chat「AN-KAN」アプリの受け口
//   - AN-KANは通知専用のアプリ。スペースに追加されたときと、話しかけられたときに短く返事をするだけ
//   - Chat API の「構成」→ 接続設定 の HTTP エンドポイント URL にこのURLを登録する
//       https://<AN-KANのURL>/api/chat/events
//   - 従来のChatアプリ形式（event.type）と、Google Workspace アドオン形式（event.chat.*）の両方に対応
// ============================================================

const ADDED_TEXT = "AN-KANです。このスペース名の案件番号について、入荷予定日の変更などをお知らせします。";
const MESSAGE_TEXT = "AN-KANは通知専用のアプリです。案件の内容はAN-KANの画面で確認してください。";

export async function POST(request) {
  const event = await request.json().catch(() => ({}));

  // Google Workspace アドオン形式
  if (event.chat) {
    let text = "";
    if (event.chat.addedToSpacePayload) text = ADDED_TEXT;
    else if (event.chat.messagePayload) text = MESSAGE_TEXT;
    if (!text) return Response.json({});
    return Response.json({
      hostAppDataAction: { chatDataAction: { createMessageAction: { message: { text } } } },
    });
  }

  // 従来のChatアプリ形式
  if (event.type === "ADDED_TO_SPACE") return Response.json({ text: ADDED_TEXT });
  if (event.type === "MESSAGE") return Response.json({ text: MESSAGE_TEXT });
  return Response.json({});
}
