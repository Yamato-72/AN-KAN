import { ActivityItem } from "./ActivityItem";

export function ProjectActivities({ activities }) {
  if (!activities || activities.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          アクティビティ履歴
        </h2>
      </div>
      <div className="px-6 py-4">
        <div className="space-y-4">
          {activities.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))}
        </div>
      </div>
    </div>
  );
}



