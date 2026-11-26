import {
  Monitor,
  Building,
  Users,
  FileText,
  BarChart3,
  Settings,
  Wrench,
  Flag,
  Banknote,
  Package,
  TrendingUp,
  Home,
  CalendarDays,
  CheckSquare,
  BookOpen,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createSecretUrl } from "@/utils/secretPath";

export const Sidebar = () => {
  const [pathname, setPathname] = useState("");

  useEffect(() => {
    setPathname(window.location.pathname);
  }, []);

  const menuItems = [
    {
      icon: Monitor,
      href: createSecretUrl("/"), // スタッフ選択ページに変更
      isActive:
        pathname === createSecretUrl("/") ||
        pathname.includes(createSecretUrl("/dashboard")), // ダッシュボード関連ページもアクティブ表示
      title: "ダッシュボード",
    },
    {
      icon: FileText,
      href: createSecretUrl("/all-project"),
      isActive:
        pathname.startsWith(createSecretUrl("/all-project")) ||
        pathname.startsWith(createSecretUrl("/projects")),
      title: "プロジェクト一覧",
    },
      {
      icon: Flag,
      href: createSecretUrl("/lost-hold"),                // ★ 失注・保留ページ
      isActive: pathname.startsWith(createSecretUrl("/lost-hold")),
      title: "失注・保留",
    },
    {
      icon: BarChart3,
      href: (() => {
        const path = pathname || "";
        const segments = path.split("/").filter(Boolean);
        const secret = segments[0];      // 例: "abc123"（secretPath）
        const id = segments[2];          // 例: "B"（userId）
        return createSecretUrl(`/analysis/${id || ""}`);
      })(),
      isActive: pathname.includes("/analysis/"),
      title: "分析",
    },
    {
      icon: TrendingUp,
      href: createSecretUrl("/analytics"),
      isActive: pathname.includes("/analytics"),
      title: "売上分析",
    },
    {
      icon: Building,
      href: createSecretUrl("/clients"),
      isActive: pathname.startsWith(createSecretUrl("/clients")),
      title: "取引先",
    },
    {
      icon: Wrench,
      href: createSecretUrl("/contractors"),
      isActive: pathname.startsWith(createSecretUrl("/contractors")),
      title: "設置業者",
    },
  ];

  // ほかのナビ（YSナビのキーと同じ色・同じ順番：業務の流れ）
  const NAVI = "https://yamato-72.github.io";
  const naviItems = [
    { title: "YSナビ（入口）", href: `${NAVI}/procurement-system/home.html`, color: "#161616", fg: "#ffd21f", icon: Home },
    { title: "納期ナビ", href: `${NAVI}/ys-tools/deliverytime.html`, color: "#e0823f", fg: "#161616", icon: CalendarDays },
    { title: "支払ナビ", href: `${NAVI}/procurement-system/index.html`, color: "#e9bd3c", fg: "#161616", icon: Banknote },
    { title: "在庫ナビ", href: `${NAVI}/procurement-system/inventory.html`, color: "#c9995c", fg: "#161616", icon: Package },
    { title: "品質ナビ", href: `${NAVI}/procurement-system/quality.html`, color: "#4f9c95", fg: "#ffffff", icon: CheckSquare },
    { title: "製品ナビ", href: `${NAVI}/procurement-system/genba.html`, color: "#4f72a8", fg: "#ffffff", icon: BookOpen },
  ];

  const handleNavigation = (href) => {
    window.location.href = href;
  };

  return (
    <aside className="hidden lg:flex flex-col items-center gap-6 pt-24 pb-6 w-16 border-r border-gray-200 fixed left-0 top-0 h-full z-20 bg-white">
      {menuItems.map(({ icon: Icon, href, isActive, title }, index) => (
        <button
          key={index}
          type="button"
          title={title}
          aria-label={title}
          onClick={() => handleNavigation(href)}
          className="group relative grid place-items-center h-9 w-9 rounded-lg transition-colors hover:bg-gray-100"
        >
          <Icon
            className={`h-5 w-5 transition-colors ${
              isActive ? "text-ankan" : "text-gray-400 group-hover:text-gray-700"
            }`}
          />
          {isActive && (
            <span className="absolute -left-[14px] top-1.5 bg-ankan h-6 w-1 rounded-r"></span>
          )}
        </button>
      ))}

      {/* ほかのナビ：小さな色つきのキー */}
      <div className="mt-2 pt-5 border-t border-gray-200 flex flex-col items-center gap-2.5">
        {naviItems.map(({ title, href, color, fg, icon: Icon }) => (
          <a
            key={title}
            href={href}
            title={title}
            aria-label={title}
            className="grid place-items-center h-8 w-8 rounded-lg transition-transform hover:-translate-y-0.5 active:translate-y-[2px]"
            style={{ background: color, color: fg, boxShadow: "inset 0 1px 0 rgba(255,255,255,.35), 0 3px 0 rgba(0,0,0,.25)" }}
          >
            <Icon className="h-4 w-4" />
          </a>
        ))}
      </div>

      <div className="mt-auto">
        <Settings className="h-5 w-5 text-gray-400 hover:text-gray-600 cursor-pointer" />
      </div>
    </aside>
  );
};



