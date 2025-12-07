import sql from "@/app/api/utils/sql";

export async function GET() {
  try {
    // AD番号の最大値を取得
    const result = await sql`
      SELECT COALESCE(MAX(ad_number), 0) as max_ad_number 
      FROM projects 
      WHERE ad_number IS NOT NULL
    `;

    const maxAdNumber = result[0]?.max_ad_number || 0;
    const nextAdNumber = maxAdNumber + 1;

    return Response.json({
      nextAdNumber,
      maxAdNumber,
    });
  } catch (error) {
    console.error("次のAD番号の取得に失敗しました:", error);
    return Response.json(
      { error: "次のAD番号の取得に失敗しました" },
      { status: 500 },
    );
  }
}



