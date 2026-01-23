import { ProjectCard } from "./ProjectCard";

export const ProjectGrid = ({
  projects,
  isLoading,
  error,
  onDelete,
  showDeleteButton = false,
  showGfiFlag = true,
  isGfiMode = false,
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">エラーが発生しました</div>
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">プロジェクトが見つかりません</div>
      </div>
    );
  }

  /**
   * ✅ 並び順を壊さずに重複だけ除外する
   * （Mapを使うのが一番安全）
   */
  const uniqueProjects = Array.from(
    new Map(projects.map((p) => [p.id, p])).values()
  );

  return (
    <section className="px-4 lg:pl-24 pb-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
        {uniqueProjects.map((project) => (
          <ProjectCard
            key={project.id}   // ← index禁止。必ずid
            project={project}
            onDelete={onDelete}
            showDeleteButton={showDeleteButton}
            showGfiFlag={showGfiFlag}
            isGfiMode={isGfiMode}
          />
        ))}
      </div>
    </section>
  );
};
