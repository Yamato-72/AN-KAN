import sql from "@/app/api/utils/sql";

export async function GET(request, { params }) {
  try {
    const { id } = params;

    const client = await sql`
      SELECT * FROM clients WHERE id = ${id}
    `;

    if (client.length === 0) {
      return Response.json({ error: "Client not found" }, { status: 404 });
    }

    return Response.json(client[0]);
  } catch (error) {
    console.error("Error fetching client:", error);
    return Response.json({ error: "Failed to fetch client" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params;
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

    const updatedClient = await sql`
      UPDATE clients 
      SET 
        client_name = ${client_name},
        company_address = ${company_address},
        phone_number = ${phone_number},
        contact_person = ${contact_person},
        email = ${email},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (updatedClient.length === 0) {
      return Response.json({ error: "Client not found" }, { status: 404 });
    }

    return Response.json(updatedClient[0]);
  } catch (error) {
    console.error("Error updating client:", error);
    return Response.json({ error: "Failed to update client" }, { status: 500 });
  }
}
