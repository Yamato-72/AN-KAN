import { useQuery } from "@tanstack/react-query";

export const useProjects = (assignedTeamMemberId = null) => {
  return useQuery({
    queryKey: ["projects", assignedTeamMemberId],
    queryFn: async () => {
      // Build query parameters
      const searchParams = new URLSearchParams();
      if (assignedTeamMemberId) {
        searchParams.append("assigned_team_member", assignedTeamMemberId);
      }

      const url = `/api/projects${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

      const response = await fetch(url, {
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch projects");
      }
      const data = await response.json();

      // 重複防止: idでユニークにする
      const uniqueData = data.filter(
        (project, index, self) =>
          index === self.findIndex((p) => p.id === project.id),
      );

      return uniqueData;
    },
    enabled: !!assignedTeamMemberId, // assignedTeamMemberIdがある場合のみ実行
    staleTime: 0, // すぐに古いデータと判断
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
};



