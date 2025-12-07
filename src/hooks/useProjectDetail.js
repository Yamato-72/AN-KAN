import { useState, useEffect } from "react";

export function useProjectDetail(projectId) {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) {
        throw new Error("プロジェクトの取得に失敗しました");
      }
      const data = await response.json();
      console.log("=== Project Data Debug ===");
      console.log("取得したプロジェクトデータ:", data);
      console.log("設置業者:", data.installation_contractor);
      console.log("設置日:", data.installation_date);
      setProject(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  return { project, loading, error, refetch: fetchProject };
}



