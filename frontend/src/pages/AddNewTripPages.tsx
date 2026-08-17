import { Link } from "react-router-dom";
import { TripForm } from "../components/TripForm";

export default function AddNewTripPage() {
  return (
    <main>
      <Link to="/trips">← 旅行一覧に戻る</Link>
      <TripForm />
    </main>
  );
}
