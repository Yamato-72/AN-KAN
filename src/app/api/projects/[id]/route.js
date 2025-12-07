import sql from "@/app/api/utils/sql";

export async function GET(request, { params }) {
  try {
    const { id } = params;

    // Get project information with staff member name and client information
    const project = await sql`
      SELECT 
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
      WHERE p.id = ${id}
    `;

    if (project.length === 0) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    // Get project milestones
    const milestones = await sql`
      SELECT *
      FROM project_milestones
      WHERE project_id = ${id}
      ORDER BY due_date ASC
    `;

    // Get project activities
    const activities = await sql`
      SELECT *
      FROM project_activities pa
      WHERE pa.project_id = ${id}
      ORDER BY pa.created_at DESC
      LIMIT 20
    `;

    // Get project documents
    const documents = await sql`
      SELECT *
      FROM project_documents
      WHERE project_id = ${id}
      ORDER BY created_at DESC
    `;

    const projectData = {
      ...project[0],
      milestones,
      activities,
      documents,
    };

    return Response.json(projectData);
  } catch (error) {
    console.error("Error fetching project:", error);
    return Response.json({ error: "Failed to fetch project" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();

    const {
      ad_number,
      project_name,
      client_name,
      inquiry_date,
      status,
      completion_percentage,
      assigned_team_member,
      delivery_date,
      installation_date,
      installation_contractor,
      remarks,
      product_number, // 製品番号を追加
      address,
      phone_number,
      estimated_amount,
      company_address,
      contact_person,
      email,
    } = body;

    // Check if project exists and get current project info with client data
    const existingProject = await sql`
      SELECT 
        p.*,
        c.client_name as current_client_name,
        c.company_address as current_company_address,
        c.phone_number as current_phone_number,
        c.contact_person as current_contact_person,
        c.email as current_email
      FROM projects p
      LEFT JOIN clients c ON p.client_id = c.id
      WHERE p.id = ${id}
    `;

    if (existingProject.length === 0) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    const oldProject = existingProject[0];
    let clientId = oldProject.client_id;

    // Handle client information updates
    const clientFieldsChanged =
      (client_name !== undefined &&
        client_name !== oldProject.current_client_name) ||
      (company_address !== undefined &&
        company_address !== oldProject.current_company_address) ||
      (phone_number !== undefined &&
        phone_number !== oldProject.current_phone_number) ||
      (contact_person !== undefined &&
        contact_person !== oldProject.current_contact_person) ||
      (email !== undefined && email !== oldProject.current_email);

    if (clientFieldsChanged) {
      if (clientId) {
        // Update existing client
        const clientUpdates = [];
        const clientValues = [];
        let clientParamCount = 0;

        if (client_name !== undefined) {
          clientParamCount++;
          clientUpdates.push(`client_name = $${clientParamCount}`);
          clientValues.push(client_name);
        }
        if (company_address !== undefined) {
          clientParamCount++;
          clientUpdates.push(`company_address = $${clientParamCount}`);
          clientValues.push(company_address || null);
        }
        if (phone_number !== undefined) {
          clientParamCount++;
          clientUpdates.push(`phone_number = $${clientParamCount}`);
          clientValues.push(phone_number || null);
        }
        if (contact_person !== undefined) {
          clientParamCount++;
          clientUpdates.push(`contact_person = $${clientParamCount}`);
          clientValues.push(contact_person || null);
        }
        if (email !== undefined) {
          clientParamCount++;
          clientUpdates.push(`email = $${clientParamCount}`);
          clientValues.push(email || null);
        }

        if (clientUpdates.length > 0) {
          // Add updated_at
          clientParamCount++;
          clientUpdates.push(`updated_at = $${clientParamCount}`);
          clientValues.push(new Date().toISOString());

          // Add client_id for WHERE clause
          clientParamCount++;
          clientValues.push(clientId);

          const clientUpdateQuery = `
            UPDATE clients 
            SET ${clientUpdates.join(", ")}
            WHERE id = $${clientParamCount}
          `;

          await sql(clientUpdateQuery, clientValues);
        }
      } else {
        // Create new client if not exists
        const clientResult = await sql`
          INSERT INTO clients (
            client_name,
            company_address,
            phone_number,
            contact_person,
            email
          ) VALUES (
            ${client_name || "未設定"},
            ${company_address || null},
            ${phone_number || null},
            ${contact_person || null},
            ${email || null}
          )
          RETURNING id
        `;
        clientId = clientResult[0].id;
      }
    }

    // Handle project information updates
    const updates = [];
    const values = [];
    let paramCount = 0;

    if (ad_number !== undefined) {
      paramCount++;
      updates.push(`ad_number = $${paramCount}`);
      values.push(parseInt(ad_number) || null);
    }
    if (project_name !== undefined) {
      paramCount++;
      updates.push(`project_name = $${paramCount}`);
      values.push(project_name);
    }
    if (inquiry_date !== undefined) {
      paramCount++;
      updates.push(`inquiry_date = $${paramCount}`);
      values.push(inquiry_date ? new Date(inquiry_date) : null);
    }
    if (status !== undefined) {
      paramCount++;
      updates.push(`status = $${paramCount}`);
      values.push(status);
    }
    if (completion_percentage !== undefined) {
      paramCount++;
      updates.push(`completion_percentage = $${paramCount}`);
      values.push(completion_percentage);
    }
    if (delivery_date !== undefined) {
      paramCount++;
      updates.push(`delivery_date = $${paramCount}`);
      values.push(delivery_date ? new Date(delivery_date) : null);
    }
    if (installation_date !== undefined) {
      paramCount++;
      updates.push(`installation_date = $${paramCount}`);
      values.push(installation_date ? new Date(installation_date) : null);
    }
    if (installation_contractor !== undefined) {
      paramCount++;
      updates.push(`installation_contractor = $${paramCount}`);
      values.push(installation_contractor);
    }
    if (remarks !== undefined) {
      paramCount++;
      updates.push(`remarks = $${paramCount}`);
      values.push(remarks);
    }
    if (product_number !== undefined) {
      paramCount++;
      updates.push(`product_number = $${paramCount}`);
      values.push(product_number);
    }
    if (address !== undefined) {
      paramCount++;
      updates.push(`address = $${paramCount}`);
      values.push(address);
    }
    if (estimated_amount !== undefined) {
      paramCount++;
      updates.push(`estimated_amount = $${paramCount}`);
      values.push(estimated_amount ? parseFloat(estimated_amount) : null);
    }

    // Update client_id if changed
    if (clientFieldsChanged && clientId !== oldProject.client_id) {
      paramCount++;
      updates.push(`client_id = $${paramCount}`);
      values.push(clientId);
    }

    let updatedProject = oldProject;

    if (updates.length > 0) {
      // Add updated_at
      paramCount++;
      updates.push(`updated_at = $${paramCount}`);
      values.push(new Date().toISOString());

      // Add id for WHERE clause
      paramCount++;
      values.push(id);

      const updateQuery = `
        UPDATE projects 
        SET ${updates.join(", ")}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await sql(updateQuery, values);
      updatedProject = result[0];
    }

    // Log various activity changes
    // Status change log
    if (status && status !== oldProject.status) {
      await sql`
        INSERT INTO project_activities (project_id, activity_type, description)
        VALUES (${id}, 'status_update', ${`ステータスが「${oldProject.status}」から「${status}」に変更されました`})
      `;
    }

    // Client name change log
    if (
      client_name !== undefined &&
      client_name !== oldProject.current_client_name
    ) {
      await sql`
        INSERT INTO project_activities (project_id, activity_type, description)
        VALUES (${id}, 'client_update', ${`取引先名が「${oldProject.current_client_name}」から「${client_name}」に変更されました`})
      `;
    }

    // Contact person change log
    if (
      contact_person !== undefined &&
      contact_person !== oldProject.current_contact_person
    ) {
      const oldContact = oldProject.current_contact_person || "未設定";
      const newContact = contact_person || "未設定";
      await sql`
        INSERT INTO project_activities (project_id, activity_type, description)
        VALUES (${id}, 'contact_person_update', ${`担当者名が「${oldContact}」から「${newContact}」に変更されました`})
      `;
    }

    // Email change log
    if (email !== undefined && email !== oldProject.current_email) {
      const oldEmail = oldProject.current_email || "未設定";
      const newEmail = email || "未設定";
      await sql`
        INSERT INTO project_activities (project_id, activity_type, description)
        VALUES (${id}, 'email_update', ${`メールアドレスが「${oldEmail}」から「${newEmail}」に変更されました`})
      `;
    }

    // Company address change log
    if (
      company_address !== undefined &&
      company_address !== oldProject.current_company_address
    ) {
      const oldCompanyAddress = oldProject.current_company_address || "未設定";
      const newCompanyAddress = company_address || "未設定";
      await sql`
        INSERT INTO project_activities (project_id, activity_type, description)
        VALUES (${id}, 'company_address_update', ${`会社住所が「${oldCompanyAddress}」から「${newCompanyAddress}」に変更されました`})
      `;
    }

    // Phone number change log
    if (
      phone_number !== undefined &&
      phone_number !== oldProject.current_phone_number
    ) {
      const oldPhone = oldProject.current_phone_number || "未設定";
      const newPhone = phone_number || "未設定";
      await sql`
        INSERT INTO project_activities (project_id, activity_type, description)
        VALUES (${id}, 'phone_update', ${`電話番号が「${oldPhone}」から「${newPhone}」に変更されました`})
      `;
    }

    // Address change log (installation address)
    if (address !== undefined && address !== oldProject.address) {
      const oldAddress = oldProject.address || "未設定";
      const newAddress = address || "未設定";
      await sql`
        INSERT INTO project_activities (project_id, activity_type, description)
        VALUES (${id}, 'address_update', ${`設置先住所が「${oldAddress}」から「${newAddress}」に変更されました`})
      `;
    }

    // Inquiry date change log
    if (inquiry_date !== undefined) {
      const oldDate = oldProject.inquiry_date
        ? new Date(oldProject.inquiry_date).toISOString().split("T")[0]
        : null;
      const newDate = inquiry_date || null;

      if (oldDate !== newDate) {
        const oldDateStr = oldDate
          ? new Date(oldDate).toLocaleDateString("ja-JP")
          : "未設定";
        const newDateStr = newDate
          ? new Date(newDate).toLocaleDateString("ja-JP")
          : "未設定";

        await sql`
          INSERT INTO project_activities (project_id, activity_type, description)
          VALUES (${id}, 'inquiry_date_update', ${`問い合わせ日が「${oldDateStr}」から「${newDateStr}」に変更されました`})
        `;
      }
    }

    // Delivery date change log
    if (delivery_date !== undefined) {
      const oldDate = oldProject.delivery_date
        ? new Date(oldProject.delivery_date).toISOString().split("T")[0]
        : null;
      const newDate = delivery_date || null;

      if (oldDate !== newDate) {
        const oldDateStr = oldDate
          ? new Date(oldDate).toLocaleDateString("ja-JP")
          : "未設定";
        const newDateStr = newDate
          ? new Date(newDate).toLocaleDateString("ja-JP")
          : "未設定";

        await sql`
          INSERT INTO project_activities (project_id, activity_type, description)
          VALUES (${id}, 'delivery_date_update', ${`納期が「${oldDateStr}」から「${newDateStr}」に変更されました`})
        `;
      }
    }

    // Installation date change log
    if (installation_date !== undefined) {
      const oldDate = oldProject.installation_date
        ? new Date(oldProject.installation_date).toISOString().split("T")[0]
        : null;
      const newDate = installation_date || null;

      if (oldDate !== newDate) {
        const oldDateStr = oldDate
          ? new Date(oldDate).toLocaleDateString("ja-JP")
          : "未設定";
        const newDateStr = newDate
          ? new Date(newDate).toLocaleDateString("ja-JP")
          : "未設定";

        await sql`
          INSERT INTO project_activities (project_id, activity_type, description)
          VALUES (${id}, 'installation_date_update', ${`設置日が「${oldDateStr}」から「${newDateStr}」に変更されました`})
        `;
      }
    }

    // Installation contractor change log
    if (
      installation_contractor !== undefined &&
      installation_contractor !== oldProject.installation_contractor
    ) {
      const oldContractor = oldProject.installation_contractor || "未設定";
      const newContractor = installation_contractor || "未設定";

      await sql`
        INSERT INTO project_activities (project_id, activity_type, description)
        VALUES (${id}, 'contractor_update', ${`設置業者が「${oldContractor}」から「${newContractor}」に変更されました`})
      `;
    }

    // Project name change log
    if (
      project_name !== undefined &&
      project_name !== oldProject.project_name
    ) {
      await sql`
        INSERT INTO project_activities (project_id, activity_type, description)
        VALUES (${id}, 'name_update', ${`プロジェクト名が「${oldProject.project_name}」から「${project_name}」に変更されました`})
      `;
    }

    // Assigned team member change log
    if (assigned_team_member !== undefined) {
      let assignedCode = null;
      if (assigned_team_member) {
        if (typeof assigned_team_member === "number") {
          const staff =
            await sql`SELECT code, name FROM staff_members WHERE id = ${assigned_team_member}`;
          if (staff.length > 0) {
            assignedCode = staff[0].code;
          }
        } else if (
          typeof assigned_team_member === "string" &&
          assigned_team_member.match(/^[A-Z]$/)
        ) {
          assignedCode = assigned_team_member;
        }
      }

      if (assignedCode !== oldProject.assigned_team_member) {
        // Get staff names for log
        const oldStaff = oldProject.assigned_team_member
          ? await sql`SELECT name FROM staff_members WHERE code = ${oldProject.assigned_team_member}`
          : [];
        const newStaff = assignedCode
          ? await sql`SELECT name FROM staff_members WHERE code = ${assignedCode}`
          : [];

        const oldStaffName = oldStaff.length > 0 ? oldStaff[0].name : "未設定";
        const newStaffName = newStaff.length > 0 ? newStaff[0].name : "未設定";

        await sql`
          INSERT INTO project_activities (project_id, activity_type, description)
          VALUES (${id}, 'assignee_update', ${`担当者が「${oldStaffName}」から「${newStaffName}」に変更されました`})
        `;
      }
    }

    // Remarks change log
    if (remarks !== undefined && remarks !== oldProject.remarks) {
      await sql`
        INSERT INTO project_activities (project_id, activity_type, description)
        VALUES (${id}, 'remarks_update', ${`備考が変更されました`})
      `;
    }

    // Product number change log
    if (
      product_number !== undefined &&
      product_number !== oldProject.product_number
    ) {
      const oldProductNumber = oldProject.product_number || "未設定";
      const newProductNumber = product_number || "未設定";
      await sql`
        INSERT INTO project_activities (project_id, activity_type, description)
        VALUES (${id}, 'product_number_update', ${`製品番号が「${oldProductNumber}」から「${newProductNumber}」に変更されました`})
      `;
    }

    // AD number change log
    if (
      ad_number !== undefined &&
      parseInt(ad_number) !== oldProject.ad_number
    ) {
      const oldAdNumber = oldProject.ad_number || "未設定";
      const newAdNumber = ad_number || "未設定";

      await sql`
        INSERT INTO project_activities (project_id, activity_type, description)
        VALUES (${id}, 'ad_number_update', ${`AD番号が「${oldAdNumber}」から「${newAdNumber}」に変更されました`})
      `;
    }

    // Estimated amount change log
    if (
      estimated_amount !== undefined &&
      parseFloat(estimated_amount || 0) !==
        parseFloat(oldProject.estimated_amount || 0)
    ) {
      const oldAmount = oldProject.estimated_amount
        ? `¥${Number(oldProject.estimated_amount).toLocaleString()}`
        : "未設定";
      const newAmount = estimated_amount
        ? `¥${Number(estimated_amount).toLocaleString()}`
        : "未設定";

      await sql`
        INSERT INTO project_activities (project_id, activity_type, description)
        VALUES (${id}, 'estimated_amount_update', ${`見積額が「${oldAmount}」から「${newAmount}」に変更されました`})
      `;
    }

    return Response.json(updatedProject);
  } catch (error) {
    console.error("Error updating project:", error);
    return Response.json(
      { error: "Failed to update project" },
      { status: 500 },
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    // Check if project exists
    const existingProject = await sql`
      SELECT * FROM projects WHERE id = ${id}
    `;

    if (existingProject.length === 0) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    // Delete project (cascades to related tables)
    await sql`DELETE FROM projects WHERE id = ${id}`;

    return Response.json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Error deleting project:", error);
    return Response.json(
      { error: "Failed to delete project" },
      { status: 500 },
    );
  }
}



