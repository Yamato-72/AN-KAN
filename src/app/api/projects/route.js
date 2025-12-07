import { query } from "@/lib/db";
import { createGoogleDriveFolder } from "@/app/api/utils/googleDrive";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const assigned_team_member = searchParams.get("assigned_team_member");
    const gfi = searchParams.get("gfi");

    console.log("=== Projects API Debug ===");
    console.log("gfi parameter:", gfi);
    console.log("status parameter:", status);
    console.log("assigned_team_member parameter:", assigned_team_member);

    let whereConditions = [];
    let parameters = [];

    // Status filter
    if (status && status !== "all") {
      whereConditions.push(`p.status = $${parameters.length + 1}`);
      parameters.push(status);
      console.log("Added status filter:", status);
    }

    // Assigned team member filter (code)
    if (assigned_team_member) {
      whereConditions.push(
        `p.assigned_team_member = $${parameters.length + 1}`
      );
      parameters.push(assigned_team_member);
      console.log("Added team member filter:", assigned_team_member);
    }

    // GFI filter
    if (gfi === "true") {
      whereConditions.push(`p.gfi = true`);
      console.log("Added GFI filter: p.gfi = true");
    } else if (gfi === "false") {
      whereConditions.push(`p.gfi = false`);
      console.log("Added GFI filter: p.gfi = false");
    }

    // Search filter
    if (search) {
      whereConditions.push(`(
        LOWER(p.project_name) LIKE LOWER($${parameters.length + 1}) OR
        LOWER(c.client_name) LIKE LOWER($${parameters.length + 2}) OR
        LOWER(c.contact_person) LIKE LOWER($${parameters.length + 3}) OR
        LOWER(c.email) LIKE LOWER($${parameters.length + 4}) OR
        LOWER(p.remarks) LIKE LOWER($${parameters.length + 5}) OR
        CAST(p.ad_number AS TEXT) LIKE $${parameters.length + 6}
      )`);

      const searchPattern = `%${search}%`;
      parameters.push(
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern
      );
      console.log("Added search filter:", search);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    const sql = `
      SELECT DISTINCT 
        p.*,
        s.name as assigned_team_member_name, 
        s.code as assigned_team_member_code,
        c.client_name,
        c.company_address,
        c.phone_number,
        c.contact_person,
        c.email,
        p.drive_folder_id,
        p.drive_folder_link
      FROM projects p
      LEFT JOIN staff_members s ON p.assigned_team_member = s.code
      LEFT JOIN clients c ON p.client_id = c.id
      ${whereClause}
      ORDER BY p.created_at DESC
    `;

    console.log("Final query:", sql);
    console.log("Parameters:", parameters);

    const { rows } = await query(sql, parameters);
    const projects = rows;

    console.log("Query results count:", projects.length);

    // 重複防止: idでユニークにする
    const uniqueProjects = projects.filter(
      (project, index, self) =>
        index === self.findIndex((p) => p.id === project.id)
    );

    console.log("Unique projects count:", uniqueProjects.length);
    console.log("=== Projects API Debug End ===");

    return Response.json(uniqueProjects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return Response.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      ad_number,
      project_name,
      client_name,
      inquiry_date,
      remarks,
      product_number,
      installation_date,
      installation_contractor,
      delivery_date,
      assigned_team_member,
      company_address,
      address,
      phone_number,
      estimated_amount,
      contact_person,
      email,
    } = body;

    // 必須チェック
    if (!ad_number || !project_name || !client_name || !inquiry_date) {
      return Response.json(
        { error: "AD番号、プロジェクト名、取引先名、問い合わせ日は必須です" },
        { status: 400 }
      );
    }

    // AD番号は数字
    if (isNaN(parseInt(ad_number))) {
      return Response.json(
        { error: "AD番号は数字で入力してください" },
        { status: 400 }
      );
    }

    // 担当者コード変換（ID → code / code → code）
    let assignedCode = null;
    if (assigned_team_member) {
      if (typeof assigned_team_member === "number") {
        // id → code
        const staffById = await query(
          `SELECT code FROM staff_members WHERE id = $1`,
          [assigned_team_member]
        );
        if (staffById.rows.length > 0) {
          assignedCode = staffById.rows[0].code;
        }
      } else if (
        typeof assigned_team_member === "string" &&
        assigned_team_member.match(/^[A-Z]$/)
      ) {
        const staffByCode = await query(
          `SELECT code FROM staff_members WHERE code = $1`,
          [assigned_team_member]
        );
        if (staffByCode.rows.length > 0) {
          assignedCode = assigned_team_member;
        }
      }
    }

    // まずクライアントを探す or 作る
    const existingClientRes = await query(
      `
      SELECT id FROM clients 
      WHERE client_name = $1
        AND COALESCE(company_address, '') = COALESCE($2, '')
        AND COALESCE(phone_number, '') = COALESCE($3, '')
        AND COALESCE(contact_person, '') = COALESCE($4, '')
        AND COALESCE(email, '') = COALESCE($5, '')
      `,
      [
        client_name,
        company_address || "",
        phone_number || "",
        contact_person || "",
        email || "",
      ]
    );

    let clientId;

    if (existingClientRes.rows.length > 0) {
      clientId = existingClientRes.rows[0].id;

      await query(
        `
        UPDATE clients 
        SET 
          company_address = $1,
          phone_number = $2,
          contact_person = $3,
          email = $4,
          updated_at = NOW()
        WHERE id = $5
        `,
        [
          company_address || null,
          phone_number || null,
          contact_person || null,
          email || null,
          clientId,
        ]
      );
    } else {
      const insertedClient = await query(
        `
        INSERT INTO clients (
          client_name,
          company_address,
          phone_number,
          contact_person,
          email
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id
        `,
        [
          client_name,
          company_address || null,
          phone_number || null,
          contact_person || null,
          email || null,
        ]
      );
      clientId = insertedClient.rows[0].id;
    }

    // プロジェクト登録
    const insertedProject = await query(
      `
      INSERT INTO projects (
        ad_number,
        project_name,
        client_id,
        inquiry_date,
        remarks,
        product_number,
        installation_date,
        installation_contractor,
        delivery_date,
        assigned_team_member,
        address,
        estimated_amount,
        status,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, NOW(), NOW()
      )
      RETURNING *
      `,
      [
        parseInt(ad_number),
        project_name,
        clientId,
        inquiry_date,
        remarks || null,
        product_number || null,
        installation_date || null,
        installation_contractor || null,
        delivery_date || null,
        assignedCode,
        address || null,
        estimated_amount ? parseFloat(estimated_amount) : null,
        "リード",
      ]
    );

    const project = insertedProject.rows[0];

    // 活動ログ
    await query(
      `
      INSERT INTO project_activities (project_id, activity_type, description)
      VALUES ($1, $2, $3)
      `,
      [
        project.id,
        "project_created",
        `プロジェクト「${project_name}」が作成されました`,
      ]
    );

    // Google Drive フォルダ作成
    let driveFolderId = null;
    let driveFolderLink = null;

    try {
      const folderName = `AD-${project.ad_number}`;
      const driveResult = await createGoogleDriveFolder(folderName);

      if (
        driveResult.success &&
        driveResult.folderId &&
        driveResult.webViewLink
      ) {
        driveFolderId = driveResult.folderId;
        driveFolderLink = driveResult.webViewLink;

        await query(
          `
          UPDATE projects 
          SET 
            drive_folder_id = $1,
            drive_folder_link = $2
          WHERE id = $3
          `,
          [driveFolderId, driveFolderLink, project.id]
        );

        console.log(
          "Google Drive folder created and saved to database:",
          driveResult
        );
      } else {
        console.error(
          "Google Drive folder creation failed:",
          driveResult.error
        );
      }
    } catch (driveError) {
      console.error("Google Drive integration error:", driveError);
    }

    return Response.json(project);
  } catch (error) {
    console.error("Error creating project:", error);
    return Response.json(
      { error: "プロジェクトの作成に失敗しました" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const res = await query(`DELETE FROM projects`);
    return Response.json({
      message: "全てのプロジェクトが削除されました",
      deletedCount: res.rowCount ?? null,
    });
  } catch (error) {
    console.error("Error deleting all projects:", error);
    return Response.json(
      { error: "全てのプロジェクトの削除に失敗しました" },
      { status: 500 }
    );
  }
}
