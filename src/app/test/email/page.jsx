"use client";

import { useState } from "react";
import { Mail, Send, CheckCircle, XCircle, Settings } from "lucide-react";

export default function EmailTestPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [testMethod, setTestMethod] = useState("backend"); // 'backend' or 'smtpjs'

  const handleTestEmailBackend = async (e) => {
    e.preventDefault();

    if (!email || !email.includes("@")) {
      setResult({
        success: false,
        message: "有効なメールアドレスを入力してください",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/test/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ testEmail: email }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("テストメール送信エラー:", error);
      setResult({
        success: false,
        message: "リクエストの送信に失敗しました",
        details: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmailSMTPJS = async (e) => {
    e.preventDefault();

    if (!email || !email.includes("@")) {
      setResult({
        success: false,
        message: "有効なメールアドレスを入力してください",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      console.log("SMTP.js経由でメール送信を開始...");

      // SMTP.jsが利用可能かチェック
      if (typeof window.Email === "undefined") {
        throw new Error("SMTP.jsライブラリが読み込まれていません");
      }

      // Gmail SMTP設定でメール送信
      const response = await window.Email.send({
        SecureToken: "C973D7AD-F097-4B95-91F4-40ABC5567812", // 仮のSecureToken（実際の使用時は適切なトークンを設定）
        To: email,
        From: "your-email@gmail.com", // 実際のGmailアドレスに変更
        Subject: "テストメール - Digital Signage Management System (SMTP.js)",
        Body: `
          <h2>✅ テストメール送信成功 (SMTP.js)</h2>
          <p>このメールは、Digital Signage Management SystemからSMTP.js経由で送信されたテストメールです。</p>
          <p>クライアントサイドからの直接送信が正常に動作しています。</p>
          <hr>
          <p><small>送信時刻: ${new Date().toLocaleString("ja-JP")}</small></p>
          <p><small>送信方法: SMTP.js + Gmail</small></p>
        `,
      });

      console.log("SMTP.js送信レスポンス:", response);

      setResult({
        success: true,
        message: "SMTP.js経由でテストメールを送信しました",
        details: response,
        messageId: `smtpjs_${Date.now()}`,
      });
    } catch (error) {
      console.error("SMTP.jsメール送信エラー:", error);
      setResult({
        success: false,
        message: "SMTP.js経由のメール送信に失敗しました",
        details: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmail =
    testMethod === "backend" ? handleTestEmailBackend : handleTestEmailSMTPJS;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      {/* SMTP.jsライブラリを読み込み */}
      <script src="https://smtpjs.com/v3/smtp.js"></script>

      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              メール送信テスト
            </h1>
            <p className="text-gray-600">
              システムのメール送信機能をテストします
            </p>
          </div>

          {/* 送信方法選択 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <Settings size={16} className="mr-2" />
              送信方法を選択
            </h3>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="testMethod"
                  value="backend"
                  checked={testMethod === "backend"}
                  onChange={(e) => setTestMethod(e.target.value)}
                  className="mr-2"
                />
                <span className="text-sm">バックエンド経由</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="testMethod"
                  value="smtpjs"
                  checked={testMethod === "smtpjs"}
                  onChange={(e) => setTestMethod(e.target.value)}
                  className="mr-2"
                />
                <span className="text-sm">SMTP.js (直接送信)</span>
              </label>
            </div>
          </div>

          <form onSubmit={handleTestEmail} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                テスト送信先メールアドレス
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="test@example.com"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>送信中...</span>
                </>
              ) : (
                <>
                  <Send size={20} />
                  <span>
                    テストメールを送信 (
                    {testMethod === "backend" ? "バックエンド" : "SMTP.js"})
                  </span>
                </>
              )}
            </button>
          </form>

          {result && (
            <div className="mt-8">
              <div
                className={`p-4 rounded-lg border ${
                  result.success
                    ? "text-green-800 bg-green-50 border-green-200"
                    : "text-red-800 bg-red-50 border-red-200"
                }`}
              >
                <div className="flex items-start space-x-3">
                  {result.success ? (
                    <CheckCircle size={20} className="text-green-600 mt-0.5" />
                  ) : (
                    <XCircle size={20} className="text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium">
                      {result.success ? "✅ 送信成功" : "❌ 送信失敗"}
                    </h3>
                    <p className="mt-1">{result.message || result.error}</p>
                    {result.details && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm opacity-70">
                          詳細情報
                        </summary>
                        <pre className="mt-1 text-xs bg-white bg-opacity-50 p-2 rounded border overflow-x-auto">
                          {typeof result.details === "string"
                            ? result.details
                            : JSON.stringify(result.details, null, 2)}
                        </pre>
                      </details>
                    )}
                    {result.messageId && (
                      <p className="mt-1 text-sm opacity-70">
                        メッセージID: {result.messageId}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-medium text-blue-900 mb-2">
                💡 バックエンド送信について
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• サーバー側でGmail SMTP、Resend、Mailgunなどを使用</li>
                <li>
                  • 環境変数の設定が必要（GMAIL_USER, GMAIL_APP_PASSWORD等）
                </li>
                <li>• より安全で本格的な実装</li>
              </ul>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h3 className="font-medium text-purple-900 mb-2">
                🚀 SMTP.js送信について
              </h3>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>• ブラウザから直接Gmailを使ってメール送信</li>
                <li>• SecureTokenの設定が必要（SMTP.js公式サイトで取得）</li>
                <li>• 設定が簡単で、すぐにテスト可能</li>
                <li>• プロダクション使用時はセキュリティに注意</li>
              </ul>
            </div>

            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <h3 className="font-medium text-amber-900 mb-2">⚠️ 重要な注意</h3>
              <ul className="text-sm text-amber-800 space-y-1">
                <li>• Gmail App Passwordが設定されていることを確認</li>
                <li>• 迷惑メールフォルダもチェック</li>
                <li>• 2段階認証が有効になっていることを確認</li>
                <li>• Gmail以外のメールプロバイダーでもテスト推奨</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 text-center">
            <a href="/" className="text-blue-600 hover:text-blue-700 text-sm">
              ← ホームに戻る
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}



