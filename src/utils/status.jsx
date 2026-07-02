import {
  FileText,
  CheckCircle,
  Zap,
  PlayCircle,
  DollarSign,
  AlertCircle,
  Users, // リード用のアイコン
} from "lucide-react";

// Status color mapping
export const getStatusColor = (status) => {
  switch (status) {
    case "リード":
      return "bg-indigo-100 text-indigo-700 border-indigo-200";
    case "打ち合わせ中":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "受注済み":
      return "bg-green-100 text-green-700 border-green-200";
    case "手配中":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "国際発注済":
      return "bg-purple-100 text-purple-700 border-purple-200";
    case "設置手配済":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "設置完了":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "残金請求済":
      return "bg-gray-100 text-gray-700 border-gray-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

export const getStatusIcon = (status) => {
  switch (status) {
    case "リード":
      return <Users className="h-4 w-4" />;
    case "打ち合わせ中":
      return <FileText className="h-4 w-4" />;
    case "受注済み":
      return <CheckCircle className="h-4 w-4" />;
    case "手配中":
      return <PlayCircle className="h-4 w-4" />;
    case "国際発注済":
      return <Zap className="h-4 w-4" />;
    case "設置手配済":
      return <PlayCircle className="h-4 w-4" />;
    case "設置完了":
      return <CheckCircle className="h-4 w-4" />;
    case "残金請求済":
      return <DollarSign className="h-4 w-4" />;
    default:
      return <AlertCircle className="h-4 w-4" />;
  }
};

export const getStatusText = (status) => {
  return status; // Since the status is already in Japanese
};

// Status progress configuration
//   7段階 → 5段階に集約。
//   旧「国際発注済 / 設置手配済 / 設置完了」を「手配中」ひとつに畳む。
//   両端（リード〜受注、完了）は従来どおり。完了は請求書テンプレを出すので必ず残す。
export const STATUS_STEPS = [
  {
    key: "リード",
    label: "リード",
    color: "bg-indigo-500",
    icon: Users,
  },
  {
    key: "打ち合わせ中",
    label: "打合せ",
    color: "bg-blue-500",
    icon: FileText,
  },
  { key: "受注済み", label: "受注", color: "bg-green-500", icon: CheckCircle },
  { key: "手配中", label: "手配中", color: "bg-orange-500", icon: PlayCircle },
  { key: "残金請求済", label: "完了", color: "bg-teal-500", icon: DollarSign },
];



