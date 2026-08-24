import { useBlocker, useNavigate } from "react-router-dom";
import { TripForm } from "../components/TripForm";
import { useState } from "react";
import { SuccessModal } from "../components/SuccessModal";
import { UnsavedChangesModal } from "../components/UnsavedChangesModal";
import { useBeforeUnloadWarning } from "../hooks/useBeforeUnloadWarning";

export default function AddNewTripPage() {
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const navigate = useNavigate();
  const blocker = useBlocker(isDirty);

  const handleSuccess = () => {
    setIsSuccessModalOpen(true);
  };

  const handleConfirm = () => {
    navigate("/trips");
  };

  const handleBack = () => {
    navigate("/trips");
  };

  useBeforeUnloadWarning(isDirty);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {/* 戻るリンク */}
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center text-sm font-medium text-gray-500 transition hover:text-gray-900"
        >
          ← 旅行一覧に戻る
        </button>

        {/* ページタイトル */}
        <div className="mt-6 mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            旅行新規作成
          </h1>

          <p className="mt-2 text-sm leading-6 text-gray-500">新しい旅行の情報を登録します。</p>
        </div>

        {/* フォーム */}
        <TripForm onSuccess={handleSuccess} onDirtyChange={setIsDirty} />
      </div>

      <SuccessModal
        isOpen={isSuccessModalOpen}
        message="✅旅行情報を登録しました"
        onConfirm={handleConfirm}
      />

      <UnsavedChangesModal
        isOpen={blocker.state === "blocked"}
        onCancel={() => blocker.reset?.()}
        onConfirm={() => blocker.proceed?.()}
      />
    </main>
  );
}
