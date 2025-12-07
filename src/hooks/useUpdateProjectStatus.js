import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useUpdateProjectStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      action,
      confirm = false,
      installationData = null,
      revenue = undefined,
      deliveryDate = undefined,
    }) => {
      const response = await fetch(`/api/projects/${projectId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          confirm,
          installationData,
          revenue,
          deliveryDate,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update project status");
      }

      const data = await response.json();

      // 設置情報入力が必要な場合はそのまま返す
      if (data.requiresInstallationInfo) {
        return data;
      }

      // 確認が必要な場合
      if (data.requiresConfirmation && !confirm) {
        const shouldProceed = window.confirm(data.confirmationMessage);

        if (shouldProceed) {
          // 確認後に再度APIを呼び出し
          const confirmedResponse = await fetch(
            `/api/projects/${projectId}/status`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                action,
                confirm: true,
                revenue,
                deliveryDate,
              }),
            },
          );

          if (!confirmedResponse.ok) {
            const errorData = await confirmedResponse.json();
            throw new Error(errorData.error || "ステータス更新に失敗しました");
          }

          return confirmedResponse.json();
        } else {
          // キャンセルされた場合はnullを返す
          return null;
        }
      }

      return data;
    },
    onSuccess: (data, variables) => {
      // キャンセルされた場合は何もしない
      if (data === null) {
        return;
      }

      // 設置情報入力が必要な場合は何もしない
      if (data && data.requiresInstallationInfo) {
        return;
      }

      // プロジェクトが正常に更新された場合はキャッシュを無効化
      if (data && data.project) {
        // 全てのprojectsクエリを無効化
        queryClient.invalidateQueries({ queryKey: ["projects"] });

        // 全てのdashboard-statsクエリを無効化
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });

        // 特定のプロジェクトのキャッシュも無効化
        queryClient.invalidateQueries({
          queryKey: ["project", variables.projectId],
        });

        // データを再取得
        queryClient.refetchQueries({ queryKey: ["projects"] });
        queryClient.refetchQueries({ queryKey: ["dashboard-stats"] });
      }
    },
    onError: (error) => {
      console.error("Error updating project status:", error);
    },
  });
};



