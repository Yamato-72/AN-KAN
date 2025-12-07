import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useCreateProject = ({ onSuccess, onError }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectData) => {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "プロジェクトの作成に失敗しました");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      if (onError) onError(error);
    },
  });
};



