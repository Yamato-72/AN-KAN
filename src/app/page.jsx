"use client";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-3 h-3 bg-[#D6001C] rounded-sm" />
            <h1 className="text-xl font-bold text-gray-900">AN-KAN</h1>
          </div>
          <p className="text-gray-600 mb-6 text-sm">
            YS案件管理システム。社内のGoogleアカウントでログインしてください。
          </p>
          <a
            href="/login"
            className="block w-full px-4 py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors"
          >
            Googleでログイン
          </a>
        </div>
      </div>
    </div>
  );
}
