import sql from "@/app/api/utils/sql";

export async function GET(request) {
  try {
    console.log("=== Stats API Debug Start ===");
    const { searchParams } = new URL(request.url);
    const assigned_team_member = searchParams.get("assigned_team_member");
    const gfi = searchParams.get("gfi");

    console.log("Parameters received:", { assigned_team_member, gfi });

    // Get project statistics with actual Japanese statuses
    let projectStatsQuery = `SELECT 
      COUNT(*) as total_projects,
      COUNT(CASE WHEN status = '打ち合わせ中' THEN 1 END) as meeting_projects,
      COUNT(CASE WHEN status = '受注済み' THEN 1 END) as ordered_projects,
      COUNT(CASE WHEN status = '国際発注済' THEN 1 END) as international_ordered_projects,
      COUNT(CASE WHEN status = '設置手配済' THEN 1 END) as installation_arranged_projects,
      COUNT(CASE WHEN status = '設置完了' THEN 1 END) as installation_completed_projects,
      COUNT(CASE WHEN status = '残金請求済' THEN 1 END) as payment_completed_projects,
      COUNT(CASE WHEN trouble_flag = true THEN 1 END) as trouble_projects,
      COALESCE(SUM(estimated_amount), 0) as total_budget,
      COALESCE(ROUND(AVG(completion_percentage), 1), 0) as average_completion
    FROM projects`;

    const queryParams = [];
    const whereConditions = [];

    if (assigned_team_member) {
      queryParams.push(assigned_team_member);
      whereConditions.push(`assigned_team_member = $${queryParams.length}`);
    }

    if (gfi === "true") {
      whereConditions.push("gfi = true");
    }

    if (whereConditions.length > 0) {
      projectStatsQuery += ` WHERE ${whereConditions.join(" AND ")}`;
    }

    console.log("Project query:", projectStatsQuery);
    console.log("Project query params:", queryParams);

    const projectStats = await sql(projectStatsQuery, queryParams);
    console.log("Project stats result:", projectStats);

    // Get recent activity count - filter by project assignments and GFI
    let recentActivitiesQuery = `SELECT COUNT(*) as recent_activity_count
       FROM project_activities pa
       JOIN projects p ON pa.project_id = p.id
       WHERE pa.created_at >= NOW() - INTERVAL '7 days'`;

    const activityParams = [];
    const activityConditions = [];

    if (assigned_team_member) {
      activityParams.push(assigned_team_member);
      activityConditions.push(
        `p.assigned_team_member = $${activityParams.length}`,
      );
    }

    if (gfi === "true") {
      activityConditions.push("p.gfi = true");
    }

    if (activityConditions.length > 0) {
      recentActivitiesQuery += ` AND ${activityConditions.join(" AND ")}`;
    }

    const recentActivities = await sql(recentActivitiesQuery, activityParams);

    // Get client count - filter by projects assigned to team member and GFI
    let clientStatsQuery = `SELECT COUNT(DISTINCT client_name) as total_clients
       FROM projects
       WHERE client_name IS NOT NULL AND client_name != ''`;

    const clientParams = [];
    const clientConditions = [];

    if (assigned_team_member) {
      clientParams.push(assigned_team_member);
      clientConditions.push(`assigned_team_member = $${clientParams.length}`);
    }

    if (gfi === "true") {
      clientConditions.push("gfi = true");
    }

    if (clientConditions.length > 0) {
      clientStatsQuery += ` AND ${clientConditions.join(" AND")}`;
    }

    const clientStats = await sql(clientStatsQuery, clientParams);

    // Get monthly project completion trend (last 6 months)
    let completionTrendQuery = `SELECT 
         DATE_TRUNC('month', created_at) as month,
         COUNT(CASE WHEN status = '設置完了' OR status = '残金請求済' THEN 1 END) as completed_count
       FROM projects
       WHERE created_at >= NOW() - INTERVAL '6 months'`;

    const trendParams = [];
    const trendConditions = [];

    if (assigned_team_member) {
      trendParams.push(assigned_team_member);
      trendConditions.push(`assigned_team_member = $${trendParams.length}`);
    }

    if (gfi === "true") {
      trendConditions.push("gfi = true");
    }

    if (trendConditions.length > 0) {
      completionTrendQuery += ` AND ${trendConditions.join(" AND ")}`;
    }

    const completionTrend = await sql(
      completionTrendQuery +
        ` GROUP BY DATE_TRUNC('month', created_at) ORDER BY month DESC`,
      trendParams,
    );

    // Safe data conversion with fallbacks
    const projectData = projectStats[0] || {};
    const clientData = clientStats[0] || {};
    const activityData = recentActivities[0] || {};

    const stats = {
      totalProjects: Number(projectData.total_projects) || 0,
      meetingProjects: Number(projectData.meeting_projects) || 0,
      orderedProjects: Number(projectData.ordered_projects) || 0,
      internationalOrderedProjects:
        Number(projectData.international_ordered_projects) || 0,
      installationArrangedProjects:
        Number(projectData.installation_arranged_projects) || 0,
      installationCompletedProjects:
        Number(projectData.installation_completed_projects) || 0,
      paymentCompletedProjects:
        Number(projectData.payment_completed_projects) || 0,
      troubleProjects: Number(projectData.trouble_projects) || 0,
      totalBudget: Number(projectData.total_budget) || 0,
      averageCompletion: Number(projectData.average_completion) || 0,
      totalClients: Number(clientData.total_clients) || 0,
      recentActivityCount: Number(activityData.recent_activity_count) || 0,
      completionTrend: completionTrend || [],
    };

    console.log("Dashboard stats calculated:", stats);
    return Response.json(stats);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return Response.json(
      { error: "Failed to fetch dashboard statistics" },
      { status: 500 },
    );
  }
}

