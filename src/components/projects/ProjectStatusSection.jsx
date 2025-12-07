import { StatusProgressBar } from "@/components/StatusProgressBar";

export function ProjectStatusSection({ project, onSuccess }) {
  return (
    <div className="mt-6 bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          プロジェクトステータス
        </h2>
      </div>
      <div className="px-6 py-4">
        <StatusProgressBar
          currentStatus={project.status}
          projectId={project.id}
          project={project}
          disabled={false}
          onSuccess={onSuccess}
        />
      </div>
    </div>
  );
}



