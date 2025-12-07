import sql from "@/app/api/utils/sql";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    let query = `
      SELECT 
        c.*,
        COUNT(p.id) as project_count
      FROM clients c
      LEFT JOIN projects p ON c.id = p.client_id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 0;

    // Add search filter if provided
    if (search) {
      paramCount++;
      query += ` AND (
        LOWER(c.client_name) LIKE LOWER($${paramCount}) OR
        LOWER(c.contact_person) LIKE LOWER($${paramCount}) OR
        LOWER(c.email) LIKE LOWER($${paramCount}) OR
        LOWER(c.company_address) LIKE LOWER($${paramCount}) OR
        c.phone_number LIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
    }

    query += " GROUP BY c.id ORDER BY c.created_at DESC";

    const clients = await sql(query, params);

    return Response.json(clients);
  } catch (error) {
    console.error("Error fetching clients:", error);
    return Response.json({ error: "Failed to fetch clients" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      client_name,
      company_address,
      phone_number,
      contact_person,
      email,
    } = body;

    // Validate required fields
    if (!client_name) {
      return Response.json(
        { error: "Client name is required" },
        { status: 400 },
      );
    }

    const newClient = await sql`
      INSERT INTO clients (client_name, company_address, phone_number, contact_person, email)
      VALUES (${client_name}, ${company_address}, ${phone_number}, ${contact_person}, ${email})
      RETURNING *
    `;

    return Response.json(newClient[0], { status: 201 });
  } catch (error) {
    console.error("Error creating client:", error);
    return Response.json({ error: "Failed to create client" }, { status: 500 });
  }
}
