import { useQuery } from "@tanstack/react-query";

export const useGfiProjects = (assignedTeamMemberId = null) => {
  return useQuery({
    queryKey: ["gfi-projects", assignedTeamMemberId],
    queryFn: async () => {
      // Build query parameters
      const searchParams = new URLSearchParams();
      if (assignedTeamMemberId) {
        searchParams.append("assigned_team_member", assignedTeamMemberId);
      }
      // Add gfi filter
      searchParams.append("gfi", "true");

      const url = `/api/projects${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

      const response = await fetch(url, {
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch GFI projects");
      }
      const data = await response.json();

      // 重複防止: idでユニークにする
      const uniqueData = data.filter(
        (project, index, self) =>
          index === self.findIndex((p) => p.id === project.id),
      );

      return uniqueData;
    },
    enabled: true,
    staleTime: 0, // すぐに古いデータと判断
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
};



