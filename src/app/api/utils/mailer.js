import nodemailer from "nodemailer";
import { formatProjectNumber } from "@/lib/prefixes";

// ============================================================
// 受注アラートメール（調達グループ宛）
//   - Gmail の SMTP を、和田さんアカウント＋アプリパスワードで使う
//   - 差出人アドレスは和田さん、表示名だけ「ANKAN通知」等にする
//   - 環境変数が未設定なら、送信せずに false を返す（業務は止めない）
//
//   必要な環境変数:
//     MAIL_FROM_ADDRESS   送信元アドレス（例: toshihiro.wada8010@yamato-signage.com）
//     MAIL_APP_PASSWORD   そのアカウントのアプリパスワード（16文字）
//     MAIL_FROM_NAME      差出人の表示名（例: ANKAN通知）※未設定なら "ANKAN通知"
//     MAIL_TO_PURCHASING  宛先（例: purchasing-team@yamato-signage.com）
//     ANKAN_PROJECT_URL_BASE （任意）案件詳細のURLベース。あれば本文にリンクを載せる
//                              例: https://an-kan-xxxx.run.app/＜secretPath＞/projects
// ============================================================

function getConfig() {
  const from = process.env.MAIL_FROM_ADDRESS;
  const pass = process.env.MAIL_APP_PASSWORD;
  const to = process.env.MAIL_TO_PURCHASING;
  const name = process.env.MAIL_FROM_NAME || "ANKAN通知";
  if (!from || !pass || !to) return null;
  return { from, pass, to, name };
}

function buildTransport(cfg) {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // 465はSSL
    auth: { user: cfg.from, pass: cfg.pass },
  });
}

// 受注アラートを送る
//   project: { id, prefix, ad_number, project_name, resolved_client_name }
//   actor:   受注操作をした担当者名（分かれば）
//   戻り値:  送信できたら true、設定が無い/失敗なら false
export async function sendOrderAlert(project, actor) {
  const cfg = getConfig();
  if (!cfg) {
    console.warn("[order-alert] メール設定が未登録のため送信をスキップしました");
    return false;
  }

  const number = formatProjectNumber(project.prefix, project.ad_number);
  const client = project.resolved_client_name || "（顧客未設定）";
  const name = project.project_name || "（案件名未設定）";
  const who = actor ? `\n受注操作: ${actor}` : "";

  // 案件リンク（ベースURLが設定されていれば）
  const base = process.env.ANKAN_PROJECT_URL_BASE;
  const link = base ? `\n\n案件を開く: ${base.replace(/\/$/, "")}/${project.id}` : "";

  const subject = `【受注】${number} ${client} - 調達確認のお願い`;
  const text =
    `受注が確定しました。調達の確認をお願いします。\n\n` +
    `案件番号: ${number}\n` +
    `顧客: ${client}\n` +
    `案件名: ${name}${who}${link}\n\n` +
    `― この案件について、国際発注が必要かどうかをご判断ください。\n` +
    `（このメールはANKANから自動送信されています）`;

  try {
    const transporter = buildTransport(cfg);
    await transporter.sendMail({
      from: `"${cfg.name}" <${cfg.from}>`,
      to: cfg.to,
      subject,
      text,
    });
    return true;
  } catch (e) {
    console.error("[order-alert] 送信に失敗しました:", e.message);
    return false;
  }
}
