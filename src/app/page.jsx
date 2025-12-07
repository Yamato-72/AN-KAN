"use client";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Digital Signage Project Management
          </h1>
          <p className="text-gray-600 mb-6">
            このシステムは認証されたユーザーのみアクセス可能です
          </p>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 text-sm">
              アクセスするには正しいURLを入力してください
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


