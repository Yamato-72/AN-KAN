// 秘匿パス管理用ユーティリティ
const DEFAULT_SECRET_PATH =
  "x7k9m3n8q2v5w1z4p6j9r8y3e2u7i5o1a9s8d6f3g7h2j4k8l3m9n6q2w5e8r1t7y4u2i9o6p3";

export const SECRET_PATH =
  process.env.NEXT_PUBLIC_SECRET_PATH || DEFAULT_SECRET_PATH;

// パスを含むURLを生成するヘルパー関数
export const createSecretUrl = (path) => {
  // パスが/で始まっていない場合は追加
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `/${SECRET_PATH}${normalizedPath}`;
};

// ルートページ（Homepage）のURL
export const getHomepageUrl = () => createSecretUrl("/");



