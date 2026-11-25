// ============================================================
// Google Chat「AN-KAN」アプリの受け口
//   - AN-KANは通知専用のアプリ。スペースに追加されたときと、話しかけられたときに短く返事をするだけ
//   - Chat API の「構成」→ 接続設定 の HTTP エンドポイント URL にこのURLを登録する
//       https://<AN-KANのURL>/api/chat/events
// ============================================================

export async function POST(request) {
  const event = await request.json().catch(() => ({}));
  const type = event.type || event.chat?.type || "";
  if (type === "ADDED_TO_SPACE") {
    return Response.json({
      text: "AN-KANです。このスペース名の案件番号について、入荷予定日の変更などをお知らせします。",
    });
  }
  if (type === "MESSAGE") {
    return Response.json({ text: "AN-KANは通知専用のアプリです。案件の内容はAN-KANの画面で確認してください。" });
  }
  return Response.json({});
}
