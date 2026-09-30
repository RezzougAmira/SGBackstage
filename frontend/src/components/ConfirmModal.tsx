import { useEffect, useState } from "react";

export interface ConfirmModalCheckbox {
  label: React.ReactNode;
  description?: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export interface ConfirmModalRadioOption<T extends string> {
  value: T;
  label: React.ReactNode;
  description?: React.ReactNode;
}

export interface ConfirmModalRadio<T extends string> {
  label?: React.ReactNode;
  options: ConfirmModalRadioOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

interface ConfirmModalProps<T extends string = string> {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loadingLabel?: string;
  /** Portée de la suppression, quand l'action a plusieurs portées possibles. */
  radio?: ConfirmModalRadio<T>;
  /** Option de suppression étendue, à cocher explicitement. */
  checkbox?: ConfirmModalCheckbox;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}

export function ConfirmModal<T extends string = string>({
  isOpen,
  title,
  message,
  confirmLabel = "Supprimer",
  cancelLabel = "Annuler",
  loadingLabel = "Suppression...",
  radio,
  checkbox,
  onConfirm,
  onCancel,
}: ConfirmModalProps<T>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setLoading(false);
      setError("");
      return;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    setError("");
    try {
      await onConfirm();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Une erreur est survenue lors de la suppression."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
      onClick={() => {
        if (!loading) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#131313]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10">
            <svg
              className="h-6 w-6 text-[#EF5350] dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="confirm-modal-title"
              className="font-poppins text-lg font-bold text-[#0A2540] dark:text-white"
            >
              {title}
            </h2>
            <div className="mt-2 font-poppins text-sm text-[#525f6d] dark:text-white/60">
              {message}
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 font-poppins text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">
            {error}
          </p>
        )}

        {radio && (
          <fieldset className="mt-4 flex flex-col gap-2">
            {radio.label && (
              <legend className="mb-1 font-poppins text-xs font-semibold text-[#525f6d] dark:text-white/50">
                {radio.label}
              </legend>
            )}
            {radio.options.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#e6e8f5] bg-[#fbfbfe] p-3 transition hover:border-[#004a86]/50 dark:border-white/10 dark:bg-white/5"
              >
                <input
                  type="radio"
                  name={`confirm-scope-${title}`}
                  checked={radio.value === option.value}
                  onChange={() => radio.onChange(option.value)}
                  disabled={loading}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#004a86]"
                />
                <span className="min-w-0">
                  <span className="block font-poppins text-sm font-semibold text-[#0A2540] dark:text-white">
                    {option.label}
                  </span>
                  {option.description && (
                    <span className="mt-0.5 block font-poppins text-xs text-[#525f6d] dark:text-white/50">
                      {option.description}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </fieldset>
        )}

        {checkbox && (
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-[#e6e8f5] bg-[#fbfbfe] p-3 transition hover:border-[#EF5350]/50 dark:border-white/10 dark:bg-white/5">
            <input
              type="checkbox"
              checked={checkbox.checked}
              onChange={(e) => checkbox.onChange(e.target.checked)}
              disabled={loading}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#EF5350]"
            />
            <span className="min-w-0">
              <span className="block font-poppins text-sm font-semibold text-[#0A2540] dark:text-white">
                {checkbox.label}
              </span>
              {checkbox.description && (
                <span className="mt-0.5 block font-poppins text-xs text-[#525f6d] dark:text-white/50">
                  {checkbox.description}
                </span>
              )}
            </span>
          </label>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-full border border-[#e6e8f5] bg-white px-5 py-2 font-poppins text-xs font-semibold text-[#525f6d] transition hover:bg-[#f5f6fa] disabled:opacity-50 dark:border-white/15 dark:bg-transparent dark:text-white/70 dark:hover:bg-white/5"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="rounded-full bg-[#EF5350] px-5 py-2 font-poppins text-xs font-semibold text-white transition hover:bg-[#d9433f] disabled:opacity-60"
          >
            {loading ? loadingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
