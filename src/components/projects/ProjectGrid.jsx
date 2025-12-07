import { ProjectCard } from "./ProjectCard";

export const ProjectGrid = ({
  projects,
  isLoading,
  error,
  onDelete,
  showDeleteButton = false,
  showGfiFlag = true, // 新しいプロパティを追加
  isGfiMode = false, // GFIモードかどうかを示すプロパティを追加
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

  if (projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">プロジェクトが見つかりません</div>
      </div>
    );
  }

  // 重複防止: idでユニークにする
  const uniqueProjects = projects.filter(
    (project, index, self) =>
      index === self.findIndex((p) => p.id === project.id),
  );

  return (
    <section className="px-4 lg:pl-24 pb-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
        {uniqueProjects.map((project) => (
          <ProjectCard
            key={`project-${project.id}`}
            project={project}
            onDelete={onDelete}
            showDeleteButton={showDeleteButton}
            showGfiFlag={showGfiFlag} // showGfiFlagをProjectCardに渡す
            isGfiMode={isGfiMode} // isGfiModeをProjectCardに渡す
          />
        ))}
      </div>
    </section>
  );
};



