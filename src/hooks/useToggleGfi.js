import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useToggleGfi = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, gfi }) => {
      console.log("🔄 Starting GFI toggle request:", { projectId, gfi });

      try {
        const response = await fetch(`/api/projects/${projectId}/gfi`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ gfi }),
        });

        console.log(
          "📡 GFI API response received:",
          response.status,
          response.statusText,
        );

        if (!response.ok) {
          const errorData = await response.json();
          console.error("❌ GFI API error:", errorData);
          throw new Error(errorData.error || "Failed to update GFI flag");
        }

        const result = await response.json();
        console.log("✅ GFI API success:", result);
        return result;
      } catch (error) {
        console.error("❌ GFI request failed:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("🎉 GFI toggle completed successfully:", data);
      // Invalidate all project-related queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["gfi-projects"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (error) => {
      console.error("💥 GFI toggle failed:", error);
    },
  });
};



