type PageHeaderProps = {
  backLabel: string;
  title: string;
  description?: string;
  onBack: () => void;
};

export const PageHeader = ({ backLabel, title, description, onBack }: PageHeaderProps) => (
  <div className="sticky top-24 z-40 -mx-4 border-b border-gray-200 bg-gray-50/95 backdrop-blur sm:-mx-6 lg:-mx-8">
    <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center text-sm font-medium text-gray-500 transition hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        ← {backLabel}
      </button>

      <div className="mt-3">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm leading-6 text-gray-500">{description}</p>}
      </div>
    </div>
  </div>
);
