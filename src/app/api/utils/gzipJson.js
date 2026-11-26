import { gzipSync } from "zlib";

// ============================================================
// 大きなJSONを圧縮して返す（案件一覧など。260KB → 数十KB）
//   - Next.js は API の返事を自動では圧縮しないため、ここで gzip する
//   - ブラウザが gzip を受け取れないときは、そのまま返す
// ============================================================
export function gzipJson(request, data, init = {}) {
  const body = JSON.stringify(data);
  const accepts = (request.headers.get("accept-encoding") || "").includes("gzip");
  const headers = { "Content-Type": "application/json; charset=utf-8", ...(init.headers || {}) };
  if (!accepts || body.length < 2048) {
    return new Response(body, { ...init, headers });
  }
  return new Response(gzipSync(body), {
    ...init,
    headers: { ...headers, "Content-Encoding": "gzip", Vary: "Accept-Encoding" },
  });
}
