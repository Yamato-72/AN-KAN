import sql from "@/app/api/utils/sql";

export async function GET(request, { params }) {
  try {
    const { id } = params;

    // Get client information
    const client = await sql`
      SELECT * FROM clients WHERE id = ${id}
    `;

    if (client.length === 0) {
      return Response.json({ error: "Client not found" }, { status: 404 });
    }

    // Get projects for this client with staff member information
    const projects = await sql`
      SELECT 
        p.id,
        p.ad_number,
        p.project_name,
        p.status,
        p.inquiry_date,
        p.delivery_date,
        p.installation_date,
        p.estimated_amount,
        p.created_at,
        s.name as assigned_team_member_name,
        s.code as assigned_team_member_code
      FROM projects p
      LEFT JOIN staff_members s ON p.assigned_team_member = s.code
      WHERE p.client_id = ${id}
      ORDER BY p.created_at DESC
    `;

    return Response.json({
      client: client[0],
      projects: projects,
    });
  } catch (error) {
    console.error("Error fetching client projects:", error);
    return Response.json(
      { error: "Failed to fetch client projects" },
      { status: 500 },
    );
  }
}
