import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useToggleTrouble = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, trouble_flag }) => {
      const response = await fetch(`/api/projects/${projectId}/trouble`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ trouble_flag }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "トラブルフラグの更新に失敗しました");
      }

      return response.json();
    },
    onSuccess: () => {
      // プロジェクト一覧を再取得
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["gfi-projects"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["gfi-stats"] });
    },
  });
};



