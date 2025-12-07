"use client";

import { useEffect } from "react";

export default function DevPage() {
  useEffect(() => {
    // 開発環境でのみ動作
    if (process.env.NODE_ENV === "development") {
      // スタッフセレクターページにリダイレクト
      const secretPath =
        "x7k9m3n8q2v5w1z4p6j9r8y3e2u7i5o1a9s8d6f3g7h2j4k8l3m9n6q2w5e8r1t7y4u2i9o6p3";
      window.location.href = `/${secretPath}`;
    }
  }, []);

  if (process.env.NODE_ENV !== "development") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Access Denied
            </h1>
            <p className="text-gray-600">
              This page is only available in development environment.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Development Access
          </h1>
          <p className="text-gray-600 mb-4">開発環境用アクセスページ</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">リダイレクト中...</p>
        </div>
      </div>
    </div>
  );
}



