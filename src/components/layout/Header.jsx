import { Menu, Bell, Search, MoreHorizontal, Plus } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export const Header = ({
  onMobileMenuClick,
  onMobileSearchToggle,
  onNewProjectClick,
  searchQuery,
  onSearchQueryChange,
  searchPlaceholder = "プロジェクトを検索...", // デフォルトのプレースホルダー
}) => {
  const { currentUser } = useCurrentUser();

  const handleNavigation = (path) => {
    window.location.href = path;
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 lg:pl-20 h-16 border-b border-gray-200 bg-white">
      {/* Left cluster */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMobileMenuClick}
          className="lg:hidden p-2 -ml-2 text-gray-600"
        >
          <Menu className="h-5 w-5" />
        </button>
        <button
          onClick={() =>
            handleNavigation(
              "/x7k9m3n8q2v5w1z4p6j9r8y3e2u7i5o1a9s8d6f3g7h2j4k8l3m9n6q2w5e8r1t7y4u2i9o6p3/",
            )
          }
          className="text-lg lg:text-xl font-semibold tracking-wide text-gray-700 hover:text-gray-900"
        >
          ヤマトサイネージ
        </button>
        <nav className="hidden lg:flex gap-6 text-sm ml-8">
          <button
            onClick={() =>
              handleNavigation(
                currentUser?.code
                  ? `/x7k9m3n8q2v5w1z4p6j9r8y3e2u7i5o1a9s8d6f3g7h2j4k8l3m9n6q2w5e8r1t7y4u2i9o6p3/dashboard/${currentUser.code}`
                  : "/x7k9m3n8q2v5w1z4p6j9r8y3e2u7i5o1a9s8d6f3g7h2j4k8l3m9n6q2w5e8r1t7y4u2i9o6p3/",
              )
            }
            className="text-gray-700 hover:text-gray-900 cursor-pointer"
          >
            ダッシュボード
          </button>
          <button
            onClick={() =>
              handleNavigation(
                "/x7k9m3n8q2v5w1z4p6j9r8y3e2u7i5o1a9s8d6f3g7h2j4k8l3m9n6q2w5e8r1t7y4u2i9o6p3/all-project",
              )
            }
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            プロジェクト
          </button>
          <button
            onClick={() =>
              handleNavigation(
                "/x7k9m3n8q2v5w1z4p6j9r8y3e2u7i5o1a9s8d6f3g7h2j4k8l3m9n6q2w5e8r1t7y4u2i9o6p3/clients",
              )
            }
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            クライアント
          </button>
          <button
            onClick={() =>
              handleNavigation(
                "/x7k9m3n8q2v5w1z4p6j9r8y3e2u7i5o1a9s8d6f3g7h2j4k8l3m9n6q2w5e8r1t7y4u2i9o6p3/contractors",
              )
            }
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            設置業者
          </button>
          <MoreHorizontal className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-pointer" />
        </nav>
      </div>

      {/* Center: Search bar (desktop only) */}
      <div className="flex-1 max-w-[400px] hidden lg:flex">
        <div className="relative w-full">
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-full border border-gray-200 focus:ring-0 focus:border-gray-300 focus:outline-none"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        </div>
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileSearchToggle}
          className="lg:hidden p-2 text-gray-600"
        >
          <Search className="h-5 w-5" />
        </button>
        <div className="relative">
          <Bell className="h-5 w-5 text-gray-400 cursor-pointer" />
          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-blue-600"></span>
        </div>
        <button
          onClick={onNewProjectClick}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 lg:px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">新規</span>
        </button>
      </div>
    </header>
  );
};



