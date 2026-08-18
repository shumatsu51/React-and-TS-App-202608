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
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <span className="text-xl text-green-600">✔︎</span>
          </div>

          <h2 className="mt-4 text-lg font-semibold text-gray-900">登録完了</h2>

          <p className="mt-2 text-sm text-gray-600">{message}</p>
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={onConfirm}
            className="w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-700"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
