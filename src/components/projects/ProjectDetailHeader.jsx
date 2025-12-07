import { ArrowLeft, ExternalLink } from "lucide-react";
import { getStatusColor } from "@/utils/statusColors";

export function ProjectDetailHeader({ project, onBack }) {
  return (
    <div className="bg-white rounded-lg shadow mb-6">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>戻る</span>
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900 truncate">
                {project.project_name || `プロジェクト ${project.id}`}
              </h1>
              {/* Google Drive Link */}
              {project.drive_folder_link && (
                <a
                  href={project.drive_folder_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 border border-blue-200 rounded-lg text-sm font-medium transition-colors"
                  title="Google Driveフォルダを開く"
                >
                  <ExternalLink size={14} />
                  Drive
                </a>
              )}
            </div>
            <p className="text-sm text-gray-600">
              AD-{project.ad_number || project.id}
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(project.status)}`}
          >
            {project.status}
          </span>
        </div>
      </div>
    </div>
  );
}



