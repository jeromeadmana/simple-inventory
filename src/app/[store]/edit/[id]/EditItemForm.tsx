"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { UNITS, type Unit } from "@/lib/validation";
import { updateItemAction, deleteItemAction } from "../../actions";

type Props = {
  store: string;
  id: string;
  initial: {
    name: string;
    quantity: number;
    amount: number | null;
    unit: Unit | null;
  };
};

export default function EditItemForm({ store, id, initial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(initial.quantity);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("quantity", String(quantity));
    setError(null);
    startTransition(async () => {
      const result = await updateItemAction(store, id, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/${store}/report`);
      router.refresh();
    });
  }

  function handleDelete(): void {
    if (!confirm(`Delete "${initial.name}"?`)) return;
    startTransition(async () => {
      await deleteItemAction(store, id);
      router.push(`/${store}/report`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 landscape:gap-3">
      <h1 className="text-2xl landscape:text-xl font-bold">Edit Item</h1>

      <label className="flex flex-col gap-2">
        <span className="font-medium">Name</span>
        <input
          name="name"
          type="text"
          required
          autoFocus
          defaultValue={initial.name}
          maxLength={100}
          className="h-14 px-4 rounded-xl border border-border bg-white focus:outline-none focus:ring-4 focus:ring-primary/30 focus:border-primary"
        />
      </label>

      <div className="flex flex-col gap-2">
        <span className="font-medium">Quantity</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="decrease quantity"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="h-14 w-14 rounded-xl bg-white border border-border text-2xl font-bold hover:bg-slate-100 active:scale-[0.97]"
          >
            −
          </button>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={1000000}
            value={quantity}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              setQuantity(Number.isFinite(n) && n > 0 ? n : 1);
            }}
            className="h-14 flex-1 text-center text-2xl font-bold rounded-xl border border-border bg-white focus:outline-none focus:ring-4 focus:ring-primary/30 focus:border-primary"
          />
          <button
            type="button"
            aria-label="increase quantity"
            onClick={() => setQuantity((q) => q + 1)}
            className="h-14 w-14 rounded-xl bg-white border border-border text-2xl font-bold hover:bg-slate-100 active:scale-[0.97]"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <label className="flex flex-col gap-2 flex-1">
          <span className="font-medium">
            Amount <span className="text-muted text-sm">(optional)</span>
          </span>
          <input
            name="amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            defaultValue={initial.amount ?? ""}
            className="h-14 px-4 rounded-xl border border-border bg-white focus:outline-none focus:ring-4 focus:ring-primary/30 focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-2 w-32">
          <span className="font-medium">Unit</span>
          <select
            name="unit"
            defaultValue={initial.unit ?? ""}
            className="h-14 px-3 rounded-xl border border-border bg-white focus:outline-none focus:ring-4 focus:ring-primary/30 focus:border-primary"
          >
            <option value="">—</option>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <p className="text-danger text-sm" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 mt-2">
        <button
          type="submit"
          disabled={isPending}
          className="h-14 rounded-xl bg-primary text-white font-semibold text-lg hover:bg-primary-hover active:scale-[0.99] transition disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="h-14 rounded-xl bg-white border-2 border-danger text-danger font-semibold text-lg hover:bg-red-50 active:scale-[0.99] transition disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </form>
  );
}
