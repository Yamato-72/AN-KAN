import { useState } from "react";
import { Upload, X, FileText, AlertCircle, CheckCircle } from "lucide-react";
import Papa from "papaparse";

export default function CSVImportModal({ isOpen, onClose, onSuccess }) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [csvData, setCsvData] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [encoding, setEncoding] = useState("UTF-8"); // 文字エンコーディング選択
  const [parseError, setParseError] = useState(null); // パースエラー表示

  const handleFile = (selectedFile, selectedEncoding = encoding) => {
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      alert("CSVファイルを選択してください");
      return;
    }

    setFile(selectedFile);
    setParseError(null);

    // ファイルを指定されたエンコーディングで読み込む
    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target.result;

      // CSVをパース
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            setParseError(
              `CSVの読み込み中にエラーが発生しました: ${results.errors[0].message}`,
            );
            setCsvData(null);
            return;
          }
          setCsvData(results.data);
          setParseError(null);
        },
        error: (error) => {
          setParseError(
            `CSVの読み込み中にエラーが発生しました: ${error.message}`,
          );
          setCsvData(null);
        },
      });
    };

    reader.onerror = () => {
      setParseError("ファイルの読み込みに失敗しました");
      setCsvData(null);
    };

    // 指定されたエンコーディングでファイルを読み込み
    if (selectedEncoding === "Shift_JIS") {
      reader.readAsText(selectedFile, "Shift_JIS");
    } else {
      reader.readAsText(selectedFile, "UTF-8");
    }
  };

  // エンコーディング変更時の処理
  const handleEncodingChange = (newEncoding) => {
    setEncoding(newEncoding);
    if (file) {
      // ファイルが既に選択されている場合は再読み込み
      handleFile(file, newEncoding);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!csvData) {
      alert("CSVファイルを選択してください");
      return;
    }

    try {
      setImporting(true);
      const response = await fetch("/api/projects/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ csvData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "インポートに失敗しました");
      }

      const result = await response.json();
      setImportResult(result);

      if (result.results.success > 0) {
        onSuccess();
      }
    } catch (error) {
      alert(`エラー: ${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setCsvData(null);
    setImportResult(null);
    setParseError(null);
    setEncoding("UTF-8");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">CSVインポート</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
          {!importResult ? (
            <>
              {/* CSVフォーマット説明 */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">
                  CSVフォーマット
                </h4>
                <p className="text-sm text-blue-700 mb-2">
                  以下のヘッダーでCSVファイルを作成してください：
                </p>
                <code className="text-xs bg-blue-100 p-2 rounded block overflow-x-auto">
                  ad_number,project_name,client_name,status,completion_percentage,delivery_date,installation_date,installation_contractor,remarks,assigned_team_member
                </code>
                <div className="mt-3 text-xs text-blue-600">
                  <p>• delivery_date, installation_date: YYYY-MM-DD形式</p>
                  <p>
                    • status: 打ち合わせ中, 受注済み, 国際発注済, 設置手配済,
                    設置完了, 残金請求済
                  </p>
                  <p>• assigned_team_member: 担当者コード（A, B, C, D...）</p>
                </div>
              </div>

              {/* 文字エンコーディング選択 */}
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">
                  文字エンコーディング
                </h4>
                <p className="text-sm text-yellow-700 mb-3">
                  文字化けする場合は、エンコーディングを変更してください
                </p>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="encoding"
                      value="UTF-8"
                      checked={encoding === "UTF-8"}
                      onChange={(e) => handleEncodingChange(e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-sm">UTF-8 (推奨)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="encoding"
                      value="Shift_JIS"
                      checked={encoding === "Shift_JIS"}
                      onChange={(e) => handleEncodingChange(e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-sm">Shift_JIS (Excel)</span>
                  </label>
                </div>
              </div>

              {/* ファイルアップロード */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    CSVファイルをドラッグ&ドロップするか、
                  </p>
                  <label className="mt-2 cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    <span>ファイルを選択</span>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileInput}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* パースエラー表示 */}
              {parseError && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <span className="text-sm font-medium text-red-800">
                      読み込みエラー
                    </span>
                  </div>
                  <p className="text-sm text-red-700 mt-1">{parseError}</p>
                  <p className="text-xs text-red-600 mt-2">
                    ※
                    文字化けしている場合は、上記のエンコーディングを変更してみてください
                  </p>
                </div>
              )}

              {file && !parseError && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-gray-500" />
                    <span className="text-sm font-medium">{file.name}</span>
                    <span className="text-xs text-gray-500">({encoding})</span>
                  </div>
                  {csvData && (
                    <p className="text-sm text-gray-600 mt-1">
                      {csvData.length}行のデータを読み込みました
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            /* インポート結果 */
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-6 w-6 text-green-500" />
                <h4 className="text-lg font-medium text-gray-900">
                  インポート完了
                </h4>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800">
                  {importResult.results.success}
                  件のプロジェクトを正常にインポートしました
                </p>
              </div>

              {importResult.results.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <p className="font-medium text-red-800">
                      {importResult.results.errors.length}件のエラー
                    </p>
                  </div>
                  <div className="max-h-32 overflow-y-auto">
                    {importResult.results.errors.map((error, index) => (
                      <p key={index} className="text-sm text-red-700">
                        {error}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {importResult.results.imported.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="font-medium text-gray-800 mb-2">
                    インポートされたプロジェクト:
                  </p>
                  <div className="max-h-32 overflow-y-auto">
                    {importResult.results.imported.map((project) => (
                      <p key={project.id} className="text-sm text-gray-700">
                        #{project.id}: {project.project_name}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          {!importResult ? (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleImport}
                disabled={!csvData || importing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {importing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>インポート中...</span>
                  </>
                ) : (
                  <span>インポート開始</span>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              閉じる
            </button>
          )}
        </div>
      </div>
    </div>
  );
}



