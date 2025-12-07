"use client";

import { useState, useEffect } from "react";
import {
  Mail,
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings,
  AlertTriangle,
  Send,
  Eye,
} from "lucide-react";

export default function GmailDebugPage() {
  const [testResults, setTestResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [customTestEmail, setCustomTestEmail] = useState("");
  const [customTestLoading, setCustomTestLoading] = useState(false);
  const [customTestResult, setCustomTestResult] = useState(null);

  // 自動でテスト実行
  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setLoading(true);
    setTestResults(null);

    try {
      const response = await fetch("/api/debug/gmail-test");
      const data = await response.json();
      setTestResults(data);
    } catch (error) {
      console.error("診断テスト実行エラー:", error);
      setTestResults({
        error: "診断テストの実行に失敗しました",
        details: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const runCustomTest = async (e) => {
    e.preventDefault();

    if (!customTestEmail || !customTestEmail.includes("@")) {
      setCustomTestResult({
        success: false,
        message: "有効なメールアドレスを入力してください",
      });
      return;
    }

    setCustomTestLoading(true);
    setCustomTestResult(null);

    try {
      const response = await fetch("/api/debug/gmail-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ testEmail: customTestEmail }),
      });

      const data = await response.json();
      setCustomTestResult(data);
    } catch (error) {
      console.error("カスタムテスト実行エラー:", error);
      setCustomTestResult({
        success: false,
        message: "テストの実行に失敗しました",
        details: error.message,
      });
    } finally {
      setCustomTestLoading(false);
    }
  };

  const TestResultCard = ({ test, index }) => (
    <div
      className={`p-4 rounded-lg border ${
        test.passed
          ? "bg-green-50 border-green-200"
          : "bg-red-50 border-red-200"
      }`}
    >
      <div className="flex items-start space-x-3">
        {test.passed ? (
          <CheckCircle size={20} className="text-green-600 mt-0.5" />
        ) : (
          <XCircle size={20} className="text-red-600 mt-0.5" />
        )}
        <div className="flex-1">
          <h3
            className={`font-medium ${
              test.passed ? "text-green-900" : "text-red-900"
            }`}
          >
            {index + 1}. {test.name}
          </h3>
          <div className="mt-2 space-y-1">
            {Object.entries(test.details).map(([key, value]) => (
              <div key={key} className="text-sm">
                <span className="font-medium">{key}:</span>{" "}
                <span
                  className={test.passed ? "text-green-800" : "text-red-800"}
                >
                  {typeof value === "object" ? JSON.stringify(value) : value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {/* ヘッダー */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Settings size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Gmail設定詳細診断
            </h1>
            <p className="text-gray-600">
              アプリパスワードとSMTP接続の詳細テスト
            </p>
          </div>

          {/* 再テストボタン */}
          <div className="mb-8 text-center">
            <button
              onClick={runDiagnostics}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 mx-auto"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>診断実行中...</span>
                </>
              ) : (
                <>
                  <RefreshCw size={20} />
                  <span>診断を再実行</span>
                </>
              )}
            </button>
          </div>

          {/* テスト結果表示 */}
          {testResults && !testResults.error && (
            <div className="space-y-6">
              {/* サマリー */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">診断サマリー</h3>
                    <p className="text-sm text-gray-600">
                      {testResults.timestamp &&
                        `実行時刻: ${new Date(testResults.timestamp).toLocaleString("ja-JP")}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      {testResults.summary?.passed || 0}
                    </div>
                    <div className="text-sm text-gray-600">成功</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-red-600">
                      {testResults.summary?.failed || 0}
                    </div>
                    <div className="text-sm text-gray-600">失敗</div>
                  </div>
                </div>
              </div>

              {/* 各テスト結果 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  詳細テスト結果
                </h3>
                {testResults.tests?.map((test, index) => (
                  <TestResultCard key={index} test={test} index={index} />
                ))}
              </div>
            </div>
          )}

          {/* エラー表示 */}
          {testResults?.error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <XCircle size={20} className="text-red-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-red-900">診断エラー</h3>
                  <p className="text-red-800 mt-1">{testResults.error}</p>
                  {testResults.details && (
                    <p className="text-red-700 text-sm mt-2">
                      {testResults.details}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* カスタムテストセクション */}
          <div className="mt-12 border-t pt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Send size={24} className="mr-2" />
              カスタムアドレステスト
            </h2>

            <form onSubmit={runCustomTest} className="space-y-4">
              <div>
                <label
                  htmlFor="customEmail"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  テスト送信先メールアドレス
                </label>
                <input
                  type="email"
                  id="customEmail"
                  value={customTestEmail}
                  onChange={(e) => setCustomTestEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="test@example.com"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  指定したアドレスに詳細なテストメールを送信します
                </p>
              </div>

              <button
                type="submit"
                disabled={customTestLoading}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {customTestLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>送信中...</span>
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    <span>詳細テストメールを送信</span>
                  </>
                )}
              </button>
            </form>

            {/* カスタムテスト結果 */}
            {customTestResult && (
              <div className="mt-6">
                <div
                  className={`p-4 rounded-lg border ${
                    customTestResult.success
                      ? "text-green-800 bg-green-50 border-green-200"
                      : "text-red-800 bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {customTestResult.success ? (
                      <CheckCircle
                        size={20}
                        className="text-green-600 mt-0.5"
                      />
                    ) : (
                      <XCircle size={20} className="text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <h3 className="font-medium">
                        {customTestResult.success
                          ? "✅ 送信成功"
                          : "❌ 送信失敗"}
                      </h3>
                      <p className="mt-1">{customTestResult.message}</p>
                      {customTestResult.messageId && (
                        <p className="mt-1 text-sm opacity-70">
                          メッセージID: {customTestResult.messageId}
                        </p>
                      )}
                      {customTestResult.details && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm opacity-70">
                            詳細情報
                          </summary>
                          <pre className="mt-1 text-xs bg-white bg-opacity-50 p-2 rounded border overflow-x-auto">
                            {JSON.stringify(customTestResult.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 追加情報 */}
          <div className="mt-8 space-y-4">
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <h3 className="font-medium text-amber-900 mb-2 flex items-center">
                <AlertTriangle size={20} className="mr-2" />
                診断内容
              </h3>
              <ul className="text-sm text-amber-800 space-y-1">
                <li>
                  • <strong>環境変数チェック:</strong> GMAIL_USER,
                  GMAIL_APP_PASSWORDの設定確認
                </li>
                <li>
                  • <strong>SMTP認証テスト:</strong>{" "}
                  アプリパスワードの形式と認証情報検証
                </li>
                <li>
                  • <strong>メール送信テスト:</strong> 実際のGmail
                  SMTP経由でのメール送信
                </li>
                <li>
                  • <strong>カスタムテスト:</strong>{" "}
                  指定アドレスへの詳細テストメール送信
                </li>
              </ul>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-medium text-blue-900 mb-2 flex items-center">
                <Eye size={20} className="mr-2" />
                トラブルシューティング
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• アプリパスワードは16文字の英文字のみ</li>
                <li>• Gmail以外のアドレスは使用不可</li>
                <li>• 2段階認証が有効である必要があります</li>
                <li>• ハイフンやスペースは入力しないでください</li>
                <li>• 迷惑メールフォルダもチェックしてください</li>
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



