import { useBlocker, useNavigate } from "react-router-dom";
import { TripForm } from "../components/trip/TripForm";
import { useState } from "react";
import { SuccessModal } from "../components/common/SuccessModal";
import { UnsavedChangesModal } from "../components/common/UnsavedChangesModal";
import { useBeforeUnloadWarning } from "../hooks/useBeforeUnloadWarning";
import { PageHeader } from "../components/common/PageHeader";

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
    <>
      <PageHeader
        backLabel="旅行一覧"
        title="旅行を作成"
        description="新しい旅行の情報を登録します。"
        onBack={handleBack}
      />
      <div className="mx-auto max-w-3xl py-8 sm:py-12">
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
    </>
  );
}
