import { Menu, Bell, Search, MoreHorizontal, Plus } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { SalesProgressBand } from "@/components/SalesProgressBand";

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
    <>
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 lg:pl-20 h-16 bg-ankan text-white shadow-[inset_0_-3px_0_var(--color-ankan-dark)]">
      {/* Left cluster */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMobileMenuClick}
          className="lg:hidden p-2 -ml-2 text-white"
        >
          <Menu className="h-5 w-5" />
        </button>
        <button
          onClick={() =>
            handleNavigation(
              "/x7k9m3n8q2v5w1z4p6j9r8y3e2u7i5o1a9s8d6f3g7h2j4k8l3m9n6q2w5e8r1t7y4u2i9o6p3/",
            )
          }
          className="flex items-center gap-2.5 text-white"
          title="ダッシュボードへ"
        >
          <span className="grid place-items-center h-8 w-8 rounded-lg bg-white text-ankan shadow-[0_2px_0_var(--color-ankan-dark)]">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2h8.5A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z" />
            </svg>
          </span>
          <span className="flex flex-col items-start leading-none">
            <span className="text-lg lg:text-xl font-black tracking-wide">AN-KAN</span>
            <span className="hidden sm:block text-[10px] font-medium text-white/75 mt-1 tracking-wider">ヤマトサイネージ 案件管理</span>
          </span>
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
            className="text-white font-bold cursor-pointer"
          >
            ダッシュボード
          </button>
          <button
            onClick={() =>
              handleNavigation(
                "/x7k9m3n8q2v5w1z4p6j9r8y3e2u7i5o1a9s8d6f3g7h2j4k8l3m9n6q2w5e8r1t7y4u2i9o6p3/all-project",
              )
            }
            className="text-white/70 hover:text-white cursor-pointer transition-colors"
          >
            プロジェクト
          </button>
          <button
            onClick={() =>
              handleNavigation(
                "/x7k9m3n8q2v5w1z4p6j9r8y3e2u7i5o1a9s8d6f3g7h2j4k8l3m9n6q2w5e8r1t7y4u2i9o6p3/clients",
              )
            }
            className="text-white/70 hover:text-white cursor-pointer transition-colors"
          >
            クライアント
          </button>
          <button
            onClick={() =>
              handleNavigation(
                "/x7k9m3n8q2v5w1z4p6j9r8y3e2u7i5o1a9s8d6f3g7h2j4k8l3m9n6q2w5e8r1t7y4u2i9o6p3/contractors",
              )
            }
            className="text-white/70 hover:text-white cursor-pointer transition-colors"
          >
            設置業者
          </button>
          <MoreHorizontal className="h-4 w-4 text-white/70 hover:text-white cursor-pointer" />
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
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border-0 bg-white text-gray-900 placeholder:text-gray-400 shadow-[inset_0_2px_3px_rgba(0,0,0,.12)] focus:ring-2 focus:ring-gray-900 focus:outline-none"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        </div>
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileSearchToggle}
          className="lg:hidden p-2 text-white"
        >
          <Search className="h-5 w-5" />
        </button>
        <div className="relative">
          <Bell className="h-5 w-5 text-white/80 cursor-pointer" />
          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-[#ffd21f] ring-2 ring-ankan"></span>
        </div>
        <button
          onClick={onNewProjectClick}
          className="bg-gray-900 hover:bg-black text-white px-3 lg:px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-[0_3px_0_var(--color-ankan-dark)] active:translate-y-[2px] active:shadow-[0_1px_0_var(--color-ankan-dark)] transition-transform"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">新規</span>
        </button>
      </div>
    </header>
    <SalesProgressBand />
    </>
  );
};



