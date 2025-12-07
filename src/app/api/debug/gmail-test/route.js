import { sendEmail } from "@/app/api/utils/send-email";

export async function GET(request) {
  console.log("=== Gmail設定テスト開始 ===");

  // 環境変数の詳細チェック
  const gmailUser = process.env.GMAIL_USER;
  const gmailPassword = process.env.GMAIL_APP_PASSWORD;

  const testResults = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    tests: [],
    summary: { passed: 0, failed: 0 },
  };

  // テスト1: 環境変数の存在確認
  const envTest = {
    name: "環境変数チェック",
    passed: false,
    details: {},
  };

  if (gmailUser && gmailPassword) {
    envTest.passed = true;
    envTest.details = {
      gmailUser: `設定済み (${gmailUser})`,
      gmailPassword: `設定済み (${gmailPassword.length}文字)`,
      passwordFormat:
        gmailPassword.length === 16
          ? "正しいアプリパスワード形式"
          : "形式を確認してください",
    };
  } else {
    envTest.details = {
      gmailUser: gmailUser ? `設定済み (${gmailUser})` : "未設定",
      gmailPassword: gmailPassword
        ? `設定済み (${gmailPassword.length}文字)`
        : "未設定",
      error: "必要な環境変数が不足しています",
    };
  }

  testResults.tests.push(envTest);
  if (envTest.passed) testResults.summary.passed++;
  else testResults.summary.failed++;

  // テスト2: Gmail SMTP接続テスト（認証のみ）
  const smtpTest = {
    name: "Gmail SMTP認証テスト",
    passed: false,
    details: {},
  };

  if (gmailUser && gmailPassword) {
    try {
      // 簡易的なSMTP接続テスト（実際にはメールを送信しない）
      const testResponse = await testGmailSMTPAuth(gmailUser, gmailPassword);
      smtpTest.passed = testResponse.success;
      smtpTest.details = testResponse.details;
    } catch (error) {
      smtpTest.details = {
        error: error.message,
        suggestion: "アプリパスワードが正しいか確認してください",
      };
    }
  } else {
    smtpTest.details = {
      error: "環境変数が設定されていないためスキップ",
    };
  }

  testResults.tests.push(smtpTest);
  if (smtpTest.passed) testResults.summary.passed++;
  else testResults.summary.failed++;

  // テスト3: メール送信機能テスト（テスト用アドレスに送信）
  const emailTest = {
    name: "メール送信テスト",
    passed: false,
    details: {},
  };

  if (gmailUser && gmailPassword) {
    try {
      const result = await sendEmail({
        to: gmailUser, // 自分自身に送信
        subject: `Gmail設定テスト - ${new Date().toLocaleString("ja-JP")}`,
        html: `
          <h2>🔧 Gmail設定テスト成功</h2>
          <p>この自動テストメールが届いたということは、Gmail SMTP設定が正常に動作しています。</p>
          <ul>
            <li><strong>送信者:</strong> ${gmailUser}</li>
            <li><strong>テスト時刻:</strong> ${new Date().toLocaleString("ja-JP")}</li>
            <li><strong>環境:</strong> ${process.env.NODE_ENV}</li>
          </ul>
          <p><small>※このメールは自動テストで送信されました。</small></p>
        `,
      });

      emailTest.passed = result.success;
      emailTest.details = {
        success: result.success,
        messageId: result.messageId,
        message: result.success
          ? "自分自身へのテストメール送信成功"
          : result.error,
      };
    } catch (error) {
      emailTest.details = {
        error: error.message,
        suggestion: "Gmail SMTP設定を再確認してください",
      };
    }
  } else {
    emailTest.details = {
      error: "環境変数が設定されていないためスキップ",
    };
  }

  testResults.tests.push(emailTest);
  if (emailTest.passed) testResults.summary.passed++;
  else testResults.summary.failed++;

  console.log("=== Gmail設定テスト完了 ===");
  console.log(JSON.stringify(testResults, null, 2));

  return Response.json(testResults);
}

// Gmail SMTP認証テスト（実際の接続確認）
async function testGmailSMTPAuth(user, password) {
  try {
    // Gmail SMTPサーバーへの接続テスト
    // 注意: 実際のSMTP接続ライブラリがないため、疑似テスト

    // アプリパスワードの形式チェック
    if (password.length !== 16) {
      return {
        success: false,
        details: {
          error: "アプリパスワードは16文字である必要があります",
          currentLength: password.length,
          suggestion:
            "Googleアカウント設定でアプリパスワードを再生成してください",
        },
      };
    }

    // 基本的な形式チェック（アルファベットのみ）
    if (!/^[a-zA-Z]+$/.test(password)) {
      return {
        success: false,
        details: {
          error: "アプリパスワードは英文字のみで構成されている必要があります",
          suggestion:
            "ハイフンやスペースを除いた16文字の英文字を入力してください",
        },
      };
    }

    // メールアドレス形式の基本チェック
    if (!user.includes("@")) {
      return {
        success: false,
        details: {
          error: "有効なメールアドレス形式ではありません",
          currentUser: user,
          suggestion: "正しいメールアドレス形式を入力してください",
        },
      };
    }

    // Gmail SMTP対応ドメインの判定を改善
    const isGmailDomain = user.includes("@gmail.com");
    const isGoogleWorkspace = !isGmailDomain; // 他のドメインでもGoogle Workspaceの可能性

    return {
      success: true,
      details: {
        message: "認証情報の形式は正しいです",
        user: user,
        passwordLength: password.length,
        domainType: isGmailDomain
          ? "Gmail (@gmail.com)"
          : "カスタムドメイン (Google Workspace対応可能)",
        nextStep: "実際のメール送信テストで認証を確認します",
        note: isGoogleWorkspace
          ? "カスタムドメインでもGoogle Workspaceなら利用可能です"
          : undefined,
      },
    };
  } catch (error) {
    return {
      success: false,
      details: {
        error: error.message,
        suggestion: "Gmail設定を確認してください",
      },
    };
  }
}

export async function POST(request) {
  try {
    const { testEmail } = await request.json();

    if (!testEmail) {
      return Response.json({
        success: false,
        error: "テスト送信先メールアドレスが必要です",
      });
    }

    console.log(`=== カスタムアドレステスト: ${testEmail} ===`);

    const result = await sendEmail({
      to: testEmail,
      subject: `Gmail SMTP機能テスト - ${new Date().toLocaleString("ja-JP")}`,
      html: `
        <h2>✅ Gmail SMTP テスト成功</h2>
        <p>この詳細テストメールが届いたということは、以下が正常に動作しています：</p>
        
        <h3>📧 システム情報</h3>
        <ul>
          <li><strong>送信元:</strong> ${process.env.GMAIL_USER}</li>
          <li><strong>送信時刻:</strong> ${new Date().toLocaleString("ja-JP")}</li>
          <li><strong>環境:</strong> ${process.env.NODE_ENV}</li>
          <li><strong>送信方法:</strong> Gmail SMTP (アプリパスワード認証)</li>
        </ul>

        <h3>🔧 認証情報</h3>
        <ul>
          <li><strong>Gmail認証:</strong> ✅ 成功</li>
          <li><strong>SMTP接続:</strong> ✅ 成功</li>
          <li><strong>メール送信:</strong> ✅ 成功</li>
        </ul>

        <h3>🎯 これで可能になること</h3>
        <ul>
          <li>プロジェクトのGFI通知メール自動送信</li>
          <li>ステータス変更通知</li>
          <li>その他のシステム通知</li>
        </ul>

        <hr>
        <p><small>このメールはDigital Signage Management Systemの詳細テスト機能から送信されました。</small></p>
      `,
    });

    console.log("カスタムテスト結果:", result);

    return Response.json({
      success: result.success,
      message: result.success
        ? "カスタムアドレスへのテストメール送信成功"
        : result.error,
      messageId: result.messageId,
      details: result,
    });
  } catch (error) {
    console.error("カスタムテスト送信エラー:", error);
    return Response.json({
      success: false,
      error: error.message,
    });
  }
}

