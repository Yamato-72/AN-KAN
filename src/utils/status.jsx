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
  { key: "国際発注済", label: "発注", color: "bg-purple-500", icon: Zap },
  {
    key: "設置手配済",
    label: "手配",
    color: "bg-orange-500",
    icon: PlayCircle,
  },
  {
    key: "設置完了",
    label: "設置",
    color: "bg-emerald-500",
    icon: CheckCircle,
  },
  { key: "残金請求済", label: "完了", color: "bg-teal-500", icon: DollarSign },
];



