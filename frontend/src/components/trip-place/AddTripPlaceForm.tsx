import { FormEvent, useState } from "react";

type Props = {
  onAdd: (name: string) => Promise<boolean>;
};

export const AddTripPlaceForm = ({ onAdd }: Props) => {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("場所名を入力してください");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const isAdded = await onAdd(trimmedName);

      if (isAdded) {
        setName("");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="trip-place-name" className="sr-only">
        行きたい場所
      </label>
      <div className="flex gap-2">
        <input
          id="trip-place-name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (e.target.value.trim()) setError(null);
          }}
          placeholder="行きたい場所を追加"
          aria-describedby={error ? "trip-place-name-error" : undefined}
          aria-invalid={Boolean(error)}
          className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-900"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {isSubmitting ? "追加中..." : "追加"}
        </button>
      </div>
      {error && (
        <p id="trip-place-name-error" role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </form>
  );
};
