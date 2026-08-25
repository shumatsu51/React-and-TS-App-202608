type ErrorStateProps = {
  message: string;
  onRetry: () => void;
  isRetrying?: boolean;
};

export const ErrorState = ({ message, onRetry, isRetrying = false }: ErrorStateProps) => {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"
    >
      <p>{message}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={isRetrying}
        className="mt-3 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isRetrying ? "再試行中..." : "再試行"}
      </button>
    </div>
  );
};
