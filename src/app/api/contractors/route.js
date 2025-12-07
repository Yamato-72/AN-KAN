import sql from "@/app/api/utils/sql";

// 設置業者一覧取得
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    let query = "SELECT * FROM contractors WHERE 1=1";
    const values = [];

    if (search) {
      query += " AND LOWER(contractor_name) LIKE LOWER($1)";
      values.push(`%${search}%`);
    }

    query += " ORDER BY contractor_name ASC";

    const contractors = await sql(query, values);
    return Response.json(contractors);
  } catch (error) {
    console.error("設置業者一覧取得エラー:", error);
    return Response.json(
      { error: "設置業者一覧の取得に失敗しました" },
      { status: 500 },
    );
  }
}

// 新規設置業者追加
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      contractor_name,
      company_address,
      phone_number,
      contact_person,
      email,
    } = body;

    if (!contractor_name) {
      return Response.json({ error: "業者名は必須です" }, { status: 400 });
    }

    // 重複チェック
    const existing = await sql(
      "SELECT id FROM contractors WHERE LOWER(contractor_name) = LOWER($1)",
      [contractor_name],
    );

    if (existing.length > 0) {
      return Response.json(
        { error: "この業者名は既に登録されています" },
        { status: 400 },
      );
    }

    const result = await sql(
      `INSERT INTO contractors (contractor_name, company_address, phone_number, contact_person, email, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [contractor_name, company_address, phone_number, contact_person, email],
    );

    return Response.json(result[0], { status: 201 });
  } catch (error) {
    console.error("設置業者追加エラー:", error);
    return Response.json(
      { error: "設置業者の追加に失敗しました" },
      { status: 500 },
    );
  }
}



