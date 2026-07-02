import { useState } from "react";
import { STATUS_STEPS } from "@/utils/status";
import { useUpdateProjectStatus } from "@/hooks/useUpdateProjectStatus";
import { InstallationInfoModal } from "@/components/projects/InstallationInfoModal";
import { InvoiceTemplateModal } from "@/components/projects/InvoiceTemplateModal";
import { DeliveryDateModal } from "@/components/projects/DeliveryDateModal";
import { toast } from "sonner";
import { Check } from "lucide-react";

export const StatusProgressBar = ({
  currentStatus,
  projectId,
  disabled = false,
  project,
  onUpdated,
}) => {
  const [showInstallationModal, setShowInstallationModal] = useState(false);
  const [pendingInstallationData, setPendingInstallationData] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showDeliveryDateModal, setShowDeliveryDateModal] = useState(false);
  const [showRevertModal, setShowRevertModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState("");

  const currentIndex = STATUS_STEPS.findIndex(
    (step) => step.key === currentStatus,
  );

  const updateProjectStatus = useUpdateProjectStatus();

  const handleStatusClick = async (clickedIndex) => {
    if (disabled || updateProjectStatus.isPending) {
      return;
    }

    // 現在のステータスより前のステップをクリックした場合（ステータスを戻す）
    if (clickedIndex < currentIndex) {
      setTargetStatus(STATUS_STEPS[clickedIndex].key);
      setShowRevertModal(true);
      return;
    }

    // 現在のステップをクリックした場合（戻すモーダル表示）
    if (clickedIndex === currentIndex) {
      setTargetStatus(STATUS_STEPS[clickedIndex].key);
      setShowRevertModal(true);
      return;
    }

    // 次のステップをクリックした場合（進める）
    if (clickedIndex === currentIndex + 1) {
      await handleStatusAdvance();
      return;
    }
  };

  const handleStatusAdvance = async () => {
    // 打ち合わせ中 → 受注済み の遷移の場合は、先に納期入力モーダルを表示
    if (currentStatus === "打ち合わせ中") {
      setShowDeliveryDateModal(true);
      return;
    }

    // （旧）国際発注済 → 設置手配済 の設置情報モーダル。
    //   5段階化で「国際発注済」ステータスは廃止。この分岐はもう発火しない（残置・無害）。
    //   設置業者は案件詳細から編集で記入する運用に変更。
    if (currentStatus === "国際発注済") {
      const contractorValue = project?.installation_contractor || "";
      const dateValue = project?.installation_date
        ? new Date(project.installation_date).toISOString().split("T")[0]
        : "";

      setPendingInstallationData({
        initialContractor: contractorValue,
        initialDate: dateValue,
      });
      setShowInstallationModal(true);
      return;
    }

    // 手配中 → 完了（残金請求済）の遷移で、請求書テンプレートモーダルを表示
    //   （旧フローでは「設置完了」がこの起点だった。5段階化で「手配中」に変更）
    if (currentStatus === "手配中") {
      setShowInvoiceModal(true);
      return;
    }

    try {
      const result = await updateProjectStatus.mutateAsync({
        projectId,
        action: "next",
      });

      // resultがnull（キャンセル）の場合は何もしない
      if (result === null) {
        return;
      }

      // 設置情報入力が必要な場合
      if (result.requiresInstallationInfo) {
        const pendingData = {
          initialContractor: result.currentInstallationContractor,
          initialDate: result.currentInstallationDate,
        };

        setPendingInstallationData(pendingData);
        setShowInstallationModal(true);
        return;
      }

      // 通常の完了処理
      if (result?.message) {
        toast.success(result.message);
      }

      if (onUpdated) await onUpdated();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleRevertConfirm = async () => {
    try {
      setShowRevertModal(false);

      // 現在のステップをクリックした場合は何もしない（戻さない）
      if (targetStatus === currentStatus) {
        return;
      }

      // 戻すためのアクション回数を計算
      const targetIndex = STATUS_STEPS.findIndex(
        (step) => step.key === targetStatus,
      );
      const stepsBack = currentIndex - targetIndex;

      // 複数ステップを戻す場合は、一つずつ戻す
      for (let i = 0; i < stepsBack; i++) {
        await updateProjectStatus.mutateAsync({
          projectId,
          action: "previous",
        });
      }

      toast.success(`ステータスを「${targetStatus}」に戻しました`);
    } catch (error) {
      toast.error(error.message || "ステータスの変更に失敗しました");
    } finally {
      setTargetStatus("");
    }
  };

  const handleRevertCancel = () => {
    setShowRevertModal(false);
    setTargetStatus("");
  };

  const handleInstallationConfirm = async (installationData) => {
    try {
      setShowInstallationModal(false);

      const result = await updateProjectStatus.mutateAsync({
        projectId,
        action: "next",
        confirm: true,
        installationData,
      });

      if (result?.message) {
        toast.success(result.message);
      }

      if (onUpdated) await onUpdated();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setPendingInstallationData(null);
    }
  };

  const handleInstallationCancel = () => {
    setShowInstallationModal(false);
    setPendingInstallationData(null);
  };

  const handleInvoiceConfirm = async (revenue) => {
    try {
      setShowInvoiceModal(false);

      const result = await updateProjectStatus.mutateAsync({
        projectId,
        action: "next",
        confirm: true,
        revenue: revenue,
      });

      if (result?.message) {
        // 残金請求済への変更の場合は特別なお祝いスタイルで表示
        if (result.message.includes("プロジェクトを完了しました")) {
          toast.success(result.message, {
            duration: 5000,
            description: "🎉 プロジェクトが正常に完了しました",
          });
        } else {
          toast.success(result.message);
        }
      }

      if (onUpdated) await onUpdated();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleInvoiceCancel = () => {
    setShowInvoiceModal(false);
  };

  const handleDeliveryDateConfirm = async (deliveryDate) => {
    try {
      setShowDeliveryDateModal(false);

      const result = await updateProjectStatus.mutateAsync({
        projectId,
        action: "next",
        confirm: true,
        deliveryDate: deliveryDate,
      });

      if (result?.message) {
        toast.success(result.message);
      }

      if (onUpdated) await onUpdated();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDeliveryDateCancel = () => {
    setShowDeliveryDateModal(false);
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {STATUS_STEPS.map((step, index) => {
          const IconComponent = step.icon;
          const isCompleted = index < currentIndex; // 完了済み
          const isCurrent = index === currentIndex; // 現在
          const isNext = index === currentIndex + 1; // 次のステップ
          const isFuture = index > currentIndex + 1; // 未来のステップ

          // クリック可能条件
          const canRevert = (isCompleted || isCurrent) && !disabled;
          const canAdvance =
            isNext && !disabled && currentIndex < STATUS_STEPS.length - 1;
          const isClickable = canRevert || canAdvance;

          // 色とスタイルの決定
          let buttonStyle = "";
          let textStyle = "";

          if (isCompleted || isCurrent) {
            // 完了済み・現在：指定されたグレー色（リングなし）
            buttonStyle = "bg-[#89909c]";
            textStyle = "text-gray-700";
          } else if (isNext) {
            // 次のステップ：鮮やかな本来の色
            buttonStyle = step.color;
            textStyle = "text-gray-700";
          } else if (isFuture) {
            // 未来のステップ：本来の色 + グレーオーバーレイ
            buttonStyle = `${step.color} relative after:absolute after:inset-0 after:bg-gray-400 after:opacity-60 after:rounded-full`;
            textStyle = "text-gray-400";
          } else {
            // フォールバック
            buttonStyle = "bg-gray-300";
            textStyle = "text-gray-400";
          }

          return (
            <div key={step.key} className="flex flex-col items-center flex-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs mb-1 transition-all duration-200 relative ${buttonStyle} ${
                  isClickable
                    ? "cursor-pointer hover:scale-110 hover:shadow-lg pointer-events-auto"
                    : ""
                } ${updateProjectStatus.isPending ? "animate-pulse" : ""}`}
                onClick={
                  isClickable ? () => handleStatusClick(index) : undefined
                }
                title={
                  canAdvance
                    ? `次のステップ「${STATUS_STEPS[currentIndex + 1]?.label}」に進む`
                    : canRevert && isCurrent
                      ? `ステータス選択`
                      : canRevert
                        ? `「${step.label}」に戻す`
                        : ""
                }
              >
                {/* NEXT吹き出し - 次のステップにのみ表示 */}
                {isNext && !disabled && (
                  <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 bg-white text-black text-[8px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap shadow-md border border-gray-300">
                    NEXT！
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[3px] border-r-[3px] border-t-[3px] border-l-transparent border-r-transparent border-t-white"></div>
                  </div>
                )}

                {updateProjectStatus.isPending && isCurrent ? (
                  <div className="animate-spin w-3 h-3 border border-white border-t-transparent rounded-full"></div>
                ) : isCompleted || isCurrent ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <IconComponent className="h-3 w-3" />
                )}
              </div>
              <span className={`text-xs font-medium ${textStyle}`}>
                <span className="lg:hidden">
                  {step.label === "打合せ" ? "打合" : step.label}
                </span>
                <span className="hidden lg:inline">{step.label}</span>
              </span>
            </div>
          );
        })}
      </div>

      {/* ステータス戻し確認モーダル */}
      {showRevertModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-700">
                {targetStatus === currentStatus
                  ? "ステータス選択"
                  : "ステータス変更確認"}
              </h2>
            </div>

            <div className="mb-6">
              {targetStatus === currentStatus ? (
                <p className="text-gray-600 mb-2">
                  現在のステータスは「<strong>{targetStatus}</strong>」です。
                </p>
              ) : (
                <>
                  <p className="text-gray-600 mb-2">
                    ステータスを「<strong>{targetStatus}</strong>
                    」に戻しますか？
                  </p>
                  <p className="text-sm text-orange-600">
                    この操作により、プロジェクトの状態が以前の段階に戻ります。
                  </p>
                </>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleRevertCancel}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                {targetStatus === currentStatus ? "閉じる" : "キャンセル"}
              </button>
              {targetStatus !== currentStatus && (
                <button
                  onClick={handleRevertConfirm}
                  disabled={updateProjectStatus.isPending}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    updateProjectStatus.isPending
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-orange-600 text-white hover:bg-orange-700"
                  }`}
                >
                  {updateProjectStatus.isPending ? "処理中..." : "戻す"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <InstallationInfoModal
        show={showInstallationModal}
        onConfirm={handleInstallationConfirm}
        onCancel={handleInstallationCancel}
        initialContractor={pendingInstallationData?.initialContractor || ""}
        initialDate={pendingInstallationData?.initialDate || ""}
      />

      <InvoiceTemplateModal
        show={showInvoiceModal}
        onConfirm={handleInvoiceConfirm}
        onCancel={handleInvoiceCancel}
        project={project}
      />

      <DeliveryDateModal
        show={showDeliveryDateModal}
        onConfirm={handleDeliveryDateConfirm}
        onCancel={handleDeliveryDateCancel}
        project={project}
      />
    </div>
  );
};



