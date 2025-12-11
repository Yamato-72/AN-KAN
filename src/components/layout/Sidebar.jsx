import {
  Monitor,
  Building,
  Users,
  FileText,
  BarChart3,
  Settings,
  Wrench,
  Flag, 
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

  const handleNavigation = (href) => {
    window.location.href = href;
  };

  return (
    <aside className="hidden lg:flex flex-col items-center gap-8 py-8 w-16 border-r border-gray-200 fixed left-0 top-0 h-full z-20 bg-white">
      {menuItems.map(({ icon: Icon, href, isActive, title }, index) => (
        <div key={index} className="relative" title={title}>
          <Icon
            onClick={() => handleNavigation(href)}
            className={`h-5 w-5 cursor-pointer transition-colors ${
              isActive ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
            }`}
          />
          {isActive && (
            <div className="absolute -left-2 top-0 bg-blue-600 h-6 w-1 rounded-r"></div>
          )}
        </div>
      ))}

      <div className="mt-auto">
        <Settings className="h-5 w-5 text-gray-400 hover:text-gray-600 cursor-pointer" />
      </div>
    </aside>
  );
};



