// src/lib/db.js
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

// 開発中にホットリロードで Pool が増殖しないようにするおまじない
let _pool;

if (!global._pgPool) {
  global._pgPool = new Pool({
    connectionString,
    // 必要なら ssl: { rejectUnauthorized: false } を付ける（Railwayの設定次第）
  });
}

_pool = global._pgPool;

export async function query(text, params) {
  const client = await _pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}
