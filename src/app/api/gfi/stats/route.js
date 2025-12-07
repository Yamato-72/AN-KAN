import sql from "@/app/api/utils/sql";

export async function GET(request) {
  try {
    console.log("=== GFI Stats API Debug Start ===");

    // Get project statistics with actual Japanese statuses for GFI projects only
    const projectStatsQuery = `SELECT 
      COUNT(*) as total_projects,
      COUNT(CASE WHEN status = '打ち合わせ中' THEN 1 END) as meeting_projects,
      COUNT(CASE WHEN status = '受注済み' THEN 1 END) as ordered_projects,
      COUNT(CASE WHEN status = '国際発注済' THEN 1 END) as international_ordered_projects,
      COUNT(CASE WHEN status = '設置手配済' THEN 1 END) as installation_arranged_projects,
      COUNT(CASE WHEN status = '設置完了' THEN 1 END) as installation_completed_projects,
      COUNT(CASE WHEN status = '残金請求済' THEN 1 END) as payment_completed_projects,
      COALESCE(SUM(estimated_amount), 0) as total_budget,
      COALESCE(ROUND(AVG(completion_percentage), 1), 0) as average_completion
    FROM projects
    WHERE gfi = true`;

    console.log("GFI Project query:", projectStatsQuery);
    const projectStats = await sql(projectStatsQuery);
    console.log("GFI Project stats result:", projectStats);

    // Get recent activity count for GFI projects
    const recentActivitiesQuery = `SELECT COUNT(*) as recent_activity_count
       FROM project_activities pa
       JOIN projects p ON pa.project_id = p.id
       WHERE pa.created_at >= NOW() - INTERVAL '7 days'
       AND p.gfi = true`;

    const recentActivities = await sql(recentActivitiesQuery);

    // Get client count for GFI projects
    const clientStatsQuery = `SELECT COUNT(DISTINCT client_name) as total_clients
       FROM projects
       WHERE client_name IS NOT NULL AND client_name != ''
       AND gfi = true`;

    const clientStats = await sql(clientStatsQuery);

    // Get monthly project completion trend for GFI projects (last 6 months)
    const completionTrendQuery = `SELECT 
         DATE_TRUNC('month', created_at) as month,
         COUNT(CASE WHEN status = '設置完了' OR status = '残金請求済' THEN 1 END) as completed_count
       FROM projects
       WHERE created_at >= NOW() - INTERVAL '6 months'
       AND gfi = true
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY month DESC`;

    const completionTrend = await sql(completionTrendQuery);

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
      totalBudget: Number(projectData.total_budget) || 0,
      averageCompletion: Number(projectData.average_completion) || 0,
      totalClients: Number(clientData.total_clients) || 0,
      recentActivityCount: Number(activityData.recent_activity_count) || 0,
      completionTrend: completionTrend || [],
    };

    console.log("GFI stats calculated:", stats);
    return Response.json(stats);
  } catch (error) {
    console.error("Error fetching GFI stats:", error);
    return Response.json(
      { error: "Failed to fetch GFI statistics" },
      { status: 500 },
    );
  }
}

