import {
  Monitor,
  Building,
  Users,
  X,
  Wrench,
  Home,
  CalendarDays,
  Banknote,
  FileText,
  Package,
  CheckSquare,
  BookOpen,
} from "lucide-react";

// ほかのナビ（YSナビのキーと同じ色・同じ順番：業務の流れ）
const NAVI = "https://yamato-72.github.io";
const NAVI_ITEMS = [
  { title: "YSナビ", href: `${NAVI}/procurement-system/home.html`, color: "#161616", edge: "#000000", fg: "#ffd21f", icon: Home },
  { title: "納期", href: `${NAVI}/ys-tools/deliverytime.html`, color: "#e0823f", edge: "#a95a22", fg: "#161616", icon: CalendarDays },
  { title: "支払", href: `${NAVI}/procurement-system/index.html`, color: "#e9bd3c", edge: "#b08a1c", fg: "#161616", icon: FileText },
  { title: "在庫", href: `${NAVI}/procurement-system/inventory.html`, color: "#c9995c", edge: "#96703d", fg: "#161616", icon: Package },
  { title: "品質", href: `${NAVI}/procurement-system/quality.html`, color: "#4f9c95", edge: "#336f6a", fg: "#ffffff", icon: CheckSquare },
  { title: "製品", href: `${NAVI}/procurement-system/genba.html`, color: "#4f72a8", edge: "#334f7c", fg: "#ffffff", icon: BookOpen },
];
import { useCurrentUser } from "@/hooks/useCurrentUser";

export const MobileMenu = ({ show, onClose }) => {
  const { currentUser } = useCurrentUser();

  const handleNavigation = (path) => {
    window.location.href = path;
    onClose(); // メニューを閉じる
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden">
      <div className="bg-white w-72 h-full shadow-xl overflow-y-auto pb-8">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-700">メニュー</h2>
          <button onClick={onClose}>
            <X className="h-6 w-6 text-gray-400" />
          </button>
        </div>
        <nav className="p-4 space-y-4">
          <button
            onClick={() =>
              handleNavigation(
                currentUser?.code
                  ? `/x7k9m3n8q2v5w1z4p6j9r8y3e2u7i5o1a9s8d6f3g7h2j4k8l3m9n6q2w5e8r1t7y4u2i9o6p3/dashboard/${currentUser.code}`
                  : "/x7k9m3n8q2v5w1z4p6j9r8y3e2u7i5o1a9s8d6f3g7h2j4k8l3m9n6q2w5e8r1t7y4u2i9o6p3/",
              )
            }
            className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-100 text-gray-900 font-bold"
          >
            <Monitor className="h-5 w-5" />
            <span>ダッシュボード</span>
          </button>
          <button
            onClick={() =>
              handleNavigation(
                "/x7k9m3n8q2v5w1z4p6j9r8y3e2u7i5o1a9s8d6f3g7h2j4k8l3m9n6q2w5e8r1t7y4u2i9o6p3/all-project",
              )
            }
            className="w-full flex items-center gap-3 p-3 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            <Building className="h-5 w-5" />
            <span>プロジェクト</span>
          </button>
          <button
            onClick={() =>
              handleNavigation(
                "/x7k9m3n8q2v5w1z4p6j9r8y3e2u7i5o1a9s8d6f3g7h2j4k8l3m9n6q2w5e8r1t7y4u2i9o6p3/clients",
              )
            }
            className="w-full flex items-center gap-3 p-3 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            <Users className="h-5 w-5" />
            <span>クライアント</span>
          </button>
          <button
            onClick={() =>
              handleNavigation(
                "/x7k9m3n8q2v5w1z4p6j9r8y3e2u7i5o1a9s8d6f3g7h2j4k8l3m9n6q2w5e8r1t7y4u2i9o6p3/contractors",
              )
            }
            className="w-full flex items-center gap-3 p-3 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            <Wrench className="h-5 w-5" />
            <span>設置業者</span>
          </button>
        </nav>

        {/* ほかのナビ：小さな色つきのキー（押すと別タブ） */}
        <div className="px-4 pb-4">
          <div className="text-[11px] font-bold tracking-widest text-gray-400 mb-2">ほかのナビ</div>
          <div className="grid grid-cols-3 gap-2.5">
            {NAVI_ITEMS.map(({ title, href, color, edge, fg, icon: Icon }) => (
              <a
                key={title}
                href={href}
                target="_blank"
                rel="noopener"
                className="flex flex-col justify-between h-16 rounded-xl p-2 text-[13px] font-bold active:translate-y-[2px] transition-transform"
                style={{ background: color, color: fg, boxShadow: `inset 0 1px 0 rgba(255,255,255,.35), inset 0 -2px 0 rgba(0,0,0,.12), 0 4px 0 ${edge}, 0 8px 12px -6px rgba(0,0,0,.35)` }}
              >
                <Icon className="h-4 w-4" />
                <span>{title}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};



