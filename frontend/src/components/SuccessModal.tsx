type SuccessModalProps = {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
};

export const SuccessModal = ({ isOpen, message, onConfirm }: SuccessModalProps) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900">完了</h2>

          <p className="mt-3 text-sm text-gray-600">{message}</p>

          <button
            type="button"
            onClick={onConfirm}
            className="mt-6 w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-700"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
