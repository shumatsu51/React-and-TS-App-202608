import { FormEvent, useState } from "react";

type Props = {
  onAdd: (name: string) => Promise<boolean>;
};

export const AddTripPlaceForm = ({ onAdd }: Props) => {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      return;
    }

    try {
      setIsSubmitting(true);

      const isAdded = await onAdd(trimmedName);

      if (isAdded) {
        setName("");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="行きたい場所を追加"
        className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-900"
      />
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {isSubmitting ? "追加中..." : "追加"}
      </button>
    </form>
  );
};
