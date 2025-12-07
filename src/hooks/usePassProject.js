import { useState } from "react";

export function usePassProject(projectId) {
  const [passingProject, setPassingProject] = useState(false);
  const [error, setError] = useState(null);

  const passProject = async (newAssignedId) => {
    try {
      setPassingProject(true);
      setError(null);
      const response = await fetch(`/api/projects/${projectId}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newAssignedTeamMember: newAssignedId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "担当者の変更に失敗しました");
      }

      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setPassingProject(false);
    }
  };

  return { passProject, passingProject, error };
}



