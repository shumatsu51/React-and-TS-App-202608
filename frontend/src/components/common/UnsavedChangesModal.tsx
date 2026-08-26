type UnsavedChangesModalProps = {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export const UnsavedChangesModal = ({ isOpen, onCancel, onConfirm }: UnsavedChangesModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="unsaved-changes-title"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 id="unsaved-changes-title" className="text-lg font-semibold text-gray-900">
          未保存の変更があります
        </h2>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          保存せずに移動すると、入力した内容は失われます。
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            編集を続ける
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
          >
            保存せず移動
          </button>
        </div>
      </div>
    </div>
  );
};
