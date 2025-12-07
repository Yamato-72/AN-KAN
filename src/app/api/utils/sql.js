// apps/web/src/app/api/utils/sql.js
import { query } from "@/lib/db";

/**
 * sql`SELECT * FROM table WHERE id = ${id}`
 * または
 * sql("SELECT * FROM table WHERE id = $1", [id])
 * のどちらでも使えるラッパー。
 * 戻り値は rows の配列。
 */
async function sql(stringsOrText, ...values) {
  // 1) テンプレートリテラル形式 sql`...`
  if (Array.isArray(stringsOrText) && Object.prototype.hasOwnProperty.call(stringsOrText, "raw")) {
    const strings = stringsOrText;
    const params = [];
    let text = "";

    strings.forEach((str, i) => {
      text += str;
      if (i < values.length) {
        text += `$${i + 1}`;
        params.push(values[i]);
      }
    });

    const { rows } = await query(text, params);
    return rows;
  }

  // 2) 関数形式 sql("SELECT ... WHERE id = $1", [id])
  const text = stringsOrText;
  const params = values[0] || [];
  const { rows } = await query(text, params);
  return rows;
}

// いちおう transaction を呼ばれても落ちないようにダミー実装
sql.transaction = async (fn) => {
  // 本格的なトランザクションは使っていない想定。
  // 必要になったら db.js 側で client をエクスポートして対応する。
  return fn({ query });
};

export default sql;




