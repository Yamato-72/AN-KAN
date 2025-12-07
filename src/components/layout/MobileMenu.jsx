import {
  Monitor,
  Building,
  Users,
  FileText,
  BarChart3,
  Settings,
  X,
  Wrench,
} from "lucide-react";
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
      <div className="bg-white w-64 h-full shadow-xl">
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
            className="w-full flex items-center gap-3 p-3 rounded-lg bg-blue-50 text-blue-700"
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
          <div className="flex items-center gap-3 p-3 rounded-lg text-gray-600 hover:bg-gray-50">
            <FileText className="h-5 w-5" />
            <span>ドキュメント</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg text-gray-600 hover:bg-gray-50">
            <BarChart3 className="h-5 w-5" />
            <span>レポート</span>
          </div>
        </nav>
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center gap-3 p-3 rounded-lg text-gray-600 hover:bg-gray-50">
            <Settings className="h-5 w-5" />
            <span>設定</span>
          </div>
        </div>
      </div>
    </div>
  );
};



