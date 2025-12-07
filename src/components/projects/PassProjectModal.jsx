export function PassProjectModal({
  show,
  onClose,
  staffMembers,
  currentAssignedId,
  onPass,
  isLoading,
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 text-center">
            担当者を変更
          </h3>
          <p className="text-sm text-gray-600 text-center mt-1">
            新しい担当者を選択してください
          </p>
        </div>

        <div className="px-6 py-4 max-h-80 overflow-y-auto">
          <div className="space-y-3">
            {staffMembers
              .filter((staff) => staff.id !== currentAssignedId)
              .map((staff) => (
                <button
                  key={staff.id}
                  onClick={() => onPass(staff.id)}
                  disabled={isLoading}
                  className="w-full flex items-center space-x-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                    {staff.code}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900">{staff.name}</p>
                    <p className="text-sm text-gray-600">{staff.email}</p>
                  </div>
                  {isLoading && (
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  )}
                </button>
              ))}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}



