import sql from "@/app/api/utils/sql";
import { normalizePrefix, DEFAULT_PREFIX, PREFIX_NUMBER_FLOOR } from "@/lib/prefixes";

// 次の案件番号を返す
//   - ?prefix=SP のように接頭辞を受け取り、その接頭辞の中で MAX+1 を返す
//   - 接頭辞ごとに独立採番（AD は AD の続き、SP は SP の続き、TS は TS の続き）
//   - 起点(フロア)を持つ接頭辞は、DB上の最大と起点の大きい方 + 1 を出す
//     （例: TSはDBが空でも 76+1=77 から。実績の続きから振れる）
//   - 接頭辞未指定なら従来どおり AD として扱う（後方互換）
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const prefix = normalizePrefix(searchParams.get("prefix") || DEFAULT_PREFIX);

    // その接頭辞の中での最大番号を取得
    const result = await sql`
      SELECT COALESCE(MAX(ad_number), 0) as max_ad_number
      FROM projects
      WHERE prefix = ${prefix} AND ad_number IS NOT NULL
    `;

    const dbMax = result[0]?.max_ad_number || 0;
    const floor = PREFIX_NUMBER_FLOOR[prefix] || 0;
    // DB上の最大と起点の、大きい方を基準にする
    const base = Math.max(dbMax, floor);
    const nextAdNumber = base + 1;

    return Response.json({
      prefix,
      nextAdNumber,
      maxAdNumber: base,
    });
  } catch (error) {
    console.error("次の案件番号の取得に失敗しました:", error);
    return Response.json(
      { error: "次の案件番号の取得に失敗しました" },
      { status: 500 },
    );
  }
}
