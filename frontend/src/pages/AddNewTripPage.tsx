import { Link, useNavigate } from "react-router-dom";
import { TripForm } from "../components/TripForm";
import { useState } from "react";
import { SuccessModal } from "../components/SuccessModal";

export default function AddNewTripPage() {
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const navigate = useNavigate();

  const handleSuccess = () => {
    setIsSuccessModalOpen(true);
  };

  const handleConfirm = () => {
    navigate("/trips");
  };

  return (
    <>
      <main>
        <Link to="/trips">← 旅行一覧に戻る</Link>
        <h1 className="text-3xl font-bold text-gray-900">旅行新規作成</h1>
        <TripForm onSuccess={handleSuccess} />
        <SuccessModal
          isOpen={isSuccessModalOpen}
          message="旅行の登録が完了しました"
          onConfirm={handleConfirm}
        />
      </main>
    </>
  );
}
