import {
  FileText,
  CheckCircle,
  Zap,
  PlayCircle,
  DollarSign,
  AlertTriangle,
} from "lucide-react";

const StatCard = ({ title, value, icon, colorClass, onClick, isActive }) => {
  const IconComponent = icon;
  return (
    <div
      className={`bg-white border rounded-lg p-2.5 md:p-4 transition-all hover:shadow-md hover:border-blue-300 cursor-pointer ${
        isActive ? "border-blue-500 bg-blue-50 shadow-md" : "border-gray-200"
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p
            className={`text-[11px] md:text-sm ${isActive ? "text-blue-600" : "text-gray-500"}`}
          >
            {title}
          </p>
          <p className={`text-lg md:text-xl font-semibold ${colorClass}`}>{value}</p>
        </div>
        <IconComponent className={`hidden md:block h-6 w-6 ${colorClass}`} />
      </div>
    </div>
  );
};

export const DashboardStats = ({ stats, selectedFilter, onFilterChange }) => {
  // デバッグ用：statsの中身を確認
  console.log("=== DashboardStats Debug ===");
  console.log("stats:", stats);
  console.log("selectedFilter:", selectedFilter);

  // statsがundefinedまたはnullの場合の表示
  if (!stats) {
    return (
      <div className="px-4 lg:pl-24">
        <div className="grid grid-cols-3 xl:grid-cols-5 gap-2 md:gap-4 mb-4 md:mb-8">
          {[
            "打ち合わせ中",
            "受注済み",
            "手配中",
            "残金請求済",
            "トラブル",
          ].map((title, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{title}</p>
                  <p className="text-xl font-semibold text-gray-400">
                    読み込み中...
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const handleStatClick = (filterValue) => {
    if (onFilterChange) {
      // 同じフィルターがクリックされた場合は"in-progress"に戻す
      if (selectedFilter === filterValue) {
        onFilterChange("in-progress");
      } else {
        onFilterChange(filterValue);
      }
    }
  };

  return (
    <div className="px-4 lg:pl-24">
      <div className="grid grid-cols-3 xl:grid-cols-5 gap-2 md:gap-4 mb-4 md:mb-8">
        <StatCard
          title="打ち合わせ中"
          value={stats.meetingProjects || 0}
          icon={FileText}
          colorClass="text-blue-600"
          isActive={selectedFilter === "打ち合わせ中"}
          onClick={() => handleStatClick("打ち合わせ中")}
        />
        <StatCard
          title="受注済み"
          value={stats.orderedProjects || 0}
          icon={CheckCircle}
          colorClass="text-green-600"
          isActive={selectedFilter === "受注済み"}
          onClick={() => handleStatClick("受注済み")}
        />
        <StatCard
          title="手配中"
          value={stats.arrangingProjects || 0}
          icon={PlayCircle}
          colorClass="text-orange-600"
          isActive={selectedFilter === "手配中"}
          onClick={() => handleStatClick("手配中")}
        />
        <StatCard
          title="残金請求済"
          value={stats.paymentCompletedProjects || 0}
          icon={DollarSign}
          colorClass="text-gray-600"
          isActive={selectedFilter === "残金請求済"}
          onClick={() => handleStatClick("残金請求済")}
        />
        <StatCard
          title="トラブル"
          value={stats.troubleProjects || 0}
          icon={AlertTriangle}
          colorClass="text-yellow-600"
          isActive={selectedFilter === "trouble"}
          onClick={() => handleStatClick("trouble")}
        />
      </div>
    </div>
  );
};



