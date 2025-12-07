import { useQuery } from "@tanstack/react-query";

export const useDashboardStats = (assignedTeamMemberId = null) => {
  return useQuery({
    queryKey: ["dashboard-stats", assignedTeamMemberId],
    queryFn: async () => {
      // Build query parameters
      const searchParams = new URLSearchParams();
      if (assignedTeamMemberId) {
        searchParams.append("assigned_team_member", assignedTeamMemberId);
      }

      const url = `/api/dashboard/stats${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
      console.log("=== Dashboard Stats API Call ===");
      console.log("URL:", url);
      console.log("assignedTeamMemberId:", assignedTeamMemberId);

      const response = await fetch(url, {
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });
      if (!response.ok) {
        throw new Error(
          `Failed to fetch stats: ${response.status} ${response.statusText}`,
        );
      }
      const data = await response.json();
      console.log("=== Dashboard Stats Response ===");
      console.log("Response data:", data);

      // Ensure all required fields have default values
      const safeData = {
        totalProjects: Number(data.totalProjects) || 0,
        meetingProjects: Number(data.meetingProjects) || 0,
        orderedProjects: Number(data.orderedProjects) || 0,
        internationalOrderedProjects:
          Number(data.internationalOrderedProjects) || 0,
        installationArrangedProjects:
          Number(data.installationArrangedProjects) || 0,
        installationCompletedProjects:
          Number(data.installationCompletedProjects) || 0,
        paymentCompletedProjects: Number(data.paymentCompletedProjects) || 0,
        troubleProjects: Number(data.troubleProjects) || 0, // Add trouble projects
        totalBudget: Number(data.totalBudget) || 0,
        averageCompletion: Number(data.averageCompletion) || 0,
        totalClients: Number(data.totalClients) || 0,
        recentActivityCount: Number(data.recentActivityCount) || 0,
        completionTrend: Array.isArray(data.completionTrend)
          ? data.completionTrend
          : [],
      };

      console.log("=== Safe Data ===");
      console.log("Safe data:", safeData);
      return safeData;
    },
    enabled: !!assignedTeamMemberId, // assignedTeamMemberIdがある場合のみ実行
    initialData: {
      totalProjects: 0,
      meetingProjects: 0,
      orderedProjects: 0,
      internationalOrderedProjects: 0,
      installationArrangedProjects: 0,
      installationCompletedProjects: 0,
      paymentCompletedProjects: 0,
      troubleProjects: 0, // Add trouble projects to initial data
      totalBudget: 0,
      averageCompletion: 0,
      totalClients: 0,
      recentActivityCount: 0,
      completionTrend: [],
    },
    staleTime: 0, // すぐに古いデータと判断
    gcTime: 1 * 60 * 1000, // 1分間キャッシュ保持
    refetchOnWindowFocus: true, // ウィンドウフォーカス時に再取得
    refetchOnMount: true, // マウント時に再取得
  });
};



