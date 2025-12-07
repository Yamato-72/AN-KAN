"use client";

import { useState } from "react";
import { Mail, Send, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

export default function SimpleEmailTestPage() {
  const [testEmail, setTestEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const sendTestEmail = async (e) => {
    e.preventDefault();

    if (!testEmail || !testEmail.includes("@")) {
      setResult({
        success: false,
        message: "有効なメールアドレスを入力してください",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // シンプルなHTTP経由でのメール送信テスト
      const response = await fetch("https://formspree.io/f/demo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: process.env.NEXT_PUBLIC_GMAIL_USER || "test@example.com",
          message: `
Gmail SMTP設定テスト

このメールが届いていれば、以下の設定が動作しています：

📧 送信元: ${process.env.NEXT_PUBLIC_GMAIL_USER}
📅 送信日時: ${new Date().toLocaleString("ja-JP")}
🔧 テスト対象: ${testEmail}

システム情報:
- プラットフォーム: Anything (Create)
- 環境: ${process.env.NODE_ENV}
- ブラウザ: ${navigator.userAgent}

このメールはGmail SMTP機能のテストとして自動送信されました。
          `.trim(),
          subject: `Gmail SMTP機能テスト - ${new Date().toLocaleString("ja-JP")}`,
          _replyto: testEmail,
          _subject: `Gmail SMTP機能テスト - ${new Date().toLocaleString("ja-JP")}`,
        }),
      });

      if (response.ok) {
        setResult({
          success: true,
          message: "テストメール送信リクエスト完了！",
          details: "メールボックスとスパムフォルダを確認してください。",
        });
      } else {
        throw new Error(`送信失敗: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error("メール送信テストエラー:", error);
      setResult({
        success: false,
        message: "メール送信テストが失敗しました",
        details: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const testInternalAPI = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/debug/gmail-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ testEmail }),
      });

      const data = await response.json();
      setResult({
        success: data.success,
        message: data.message,
        details: JSON.stringify(data, null, 2),
      });
    } catch (error) {
      console.error("内部API テストエラー:", error);
      setResult({
        success: false,
        message: "内部APIテストが失敗しました",
        details: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {/* ヘッダー */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              シンプルメール送信テスト
            </h1>
            <p className="text-gray-600">複数の方法でメール送信機能をテスト</p>
          </div>

          {/* フォーム */}
          <form onSubmit={sendTestEmail} className="space-y-6">
            <div>
              <label
                htmlFor="testEmail"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                テスト送信先メールアドレス
              </label>
              <input
                type="email"
                id="testEmail"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your-email@example.com"
                required
              />
            </div>

            {/* テストボタン群 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Formspreeテスト */}
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center space-x-2 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <Send size={20} />
                )}
                <span>Formspree経由</span>
              </button>

              {/* 内部APIテスト */}
              <button
                type="button"
                onClick={testInternalAPI}
                disabled={loading || !testEmail}
                className="flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <Mail size={20} />
                )}
                <span>内部API経由</span>
              </button>
            </div>
          </form>

          {/* 結果表示 */}
          {result && (
            <div className="mt-8">
              <div
                className={`p-4 rounded-lg border ${
                  result.success
                    ? "bg-green-50 border-green-200 text-green-800"
                    : "bg-red-50 border-red-200 text-red-800"
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
                    <p className="mt-1">{result.message}</p>
                    {result.details && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm opacity-70">
                          詳細情報
                        </summary>
                        <pre className="mt-1 text-xs bg-white bg-opacity-50 p-2 rounded border overflow-x-auto max-h-64">
                          {result.details}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* トラブルシューティング */}
          <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h3 className="font-medium text-yellow-900 mb-2 flex items-center">
              <AlertTriangle size={20} className="mr-2" />
              トラブルシューティング
            </h3>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• メールが届かない場合はスパム/迷惑メールフォルダを確認</li>
              <li>• Gmail アプリパスワードが16文字の英字のみか確認</li>
              <li>• Gmail の2段階認証が有効になっているか確認</li>
              <li>
                • 環境変数 GMAIL_USER と GMAIL_APP_PASSWORD
                が設定されているか確認
              </li>
              <li>• 一時的に別のメールアドレスでテストしてみる</li>
            </ul>
          </div>

          <div className="mt-6 text-center">
            <a
              href="/debug/gmail"
              className="text-blue-600 hover:text-blue-700 text-sm mr-4"
            >
              ← 詳細診断に戻る
            </a>
            <a href="/" className="text-gray-600 hover:text-gray-700 text-sm">
              ホームに戻る
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}



