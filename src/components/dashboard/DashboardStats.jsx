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
      className={`bg-white border rounded-lg p-4 transition-all hover:shadow-md hover:border-blue-300 cursor-pointer ${
        isActive ? "border-blue-500 bg-blue-50 shadow-md" : "border-gray-200"
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p
            className={`text-sm ${isActive ? "text-blue-600" : "text-gray-500"}`}
          >
            {title}
          </p>
          <p className={`text-xl font-semibold ${colorClass}`}>{value}</p>
        </div>
        <IconComponent className={`h-6 w-6 ${colorClass}`} />
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
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-4 mb-8">
          {[
            "トラブル",
            "打ち合わせ中",
            "受注済み",
            "国際発注済",
            "設置手配済",
            "設置完了",
            "残金請求済",
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
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-4 mb-8">
        <StatCard
          title="トラブル"
          value={stats.troubleProjects || 0}
          icon={AlertTriangle}
          colorClass="text-yellow-600"
          isActive={selectedFilter === "trouble"}
          onClick={() => handleStatClick("trouble")}
        />
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
          title="国際発注済"
          value={stats.internationalOrderedProjects || 0}
          icon={Zap}
          colorClass="text-purple-600"
          isActive={selectedFilter === "国際発注済"}
          onClick={() => handleStatClick("国際発注済")}
        />
        <StatCard
          title="設置手配済"
          value={stats.installationArrangedProjects || 0}
          icon={PlayCircle}
          colorClass="text-orange-600"
          isActive={selectedFilter === "設置手配済"}
          onClick={() => handleStatClick("設置手配済")}
        />
        <StatCard
          title="設置完了"
          value={stats.installationCompletedProjects || 0}
          icon={CheckCircle}
          colorClass="text-emerald-600"
          isActive={selectedFilter === "設置完了"}
          onClick={() => handleStatClick("設置完了")}
        />
        <StatCard
          title="残金請求済"
          value={stats.paymentCompletedProjects || 0}
          icon={DollarSign}
          colorClass="text-gray-600"
          isActive={selectedFilter === "残金請求済"}
          onClick={() => handleStatClick("残金請求済")}
        />
      </div>
    </div>
  );
};



