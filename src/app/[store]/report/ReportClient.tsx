"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { Unit } from "@/lib/validation";
import { deleteItemAction, mergeItemsAction } from "../actions";

type Row = {
  id: string;
  name: string;
  quantity: number;
  amount: number | null;
  unit: Unit | null;
};

export default function ReportClient({ store, items }: { store: string; items: Row[] }) {
  const router = useRouter();
  const [mergeMode, setMergeMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [canonicalName, setCanonicalName] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const selectedItems = useMemo(
    () => items.filter((i) => selected.has(i.id)),
    [items, selected],
  );

  function toggleSelect(id: string): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exitMergeMode(): void {
    setMergeMode(false);
    setSelected(new Set());
    setMergeOpen(false);
    setMergeError(null);
  }

  function openMergeDialog(): void {
    if (selected.size < 2) return;
    setCanonicalName(selectedItems[0]?.name ?? "");
    setMergeError(null);
    setMergeOpen(true);
  }

  function confirmMerge(): void {
    setMergeError(null);
    startTransition(async () => {
      const result = await mergeItemsAction(store, [...selected], canonicalName);
      if (!result.ok) {
        setMergeError(result.error);
        return;
      }
      exitMergeMode();
      router.refresh();
    });
  }

  function handleDelete(id: string, name: string): void {
    if (!confirm(`Delete "${name}"?`)) return;
    startTransition(async () => {
      await deleteItemAction(store, id);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex gap-2">
        {!mergeMode ? (
          <button
            type="button"
            onClick={() => setMergeMode(true)}
            className="h-10 px-4 rounded-lg bg-white border border-border font-semibold text-sm"
            disabled={items.length < 2}
          >
            Merge mode
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={openMergeDialog}
              disabled={selected.size < 2 || isPending}
              className="h-10 px-4 rounded-lg bg-primary text-white font-semibold text-sm disabled:opacity-50"
            >
              Merge ({selected.size})
            </button>
            <button
              type="button"
              onClick={exitMergeMode}
              className="h-10 px-4 rounded-lg bg-white border border-border font-semibold text-sm"
            >
              Cancel
            </button>
          </>
        )}
      </div>

      <ul className="flex flex-col gap-2">
        {items.map((item) => {
          const isSelected = selected.has(item.id);
          return (
            <li
              key={item.id}
              className={`bg-white rounded-xl border p-3 flex items-center gap-3 ${
                isSelected ? "border-primary ring-2 ring-primary/30" : "border-border"
              }`}
            >
              {mergeMode && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(item.id)}
                  className="h-6 w-6 accent-primary shrink-0"
                  aria-label={`Select ${item.name}`}
                />
              )}
              <button
                type="button"
                onClick={() => mergeMode && toggleSelect(item.id)}
                className="flex-1 text-left min-w-0"
                disabled={!mergeMode}
              >
                <div className="font-semibold truncate">{item.name}</div>
                <div className="text-sm text-muted">
                  qty {item.quantity}
                  {item.amount !== null && item.unit !== null && (
                    <> · {item.amount} {item.unit}</>
                  )}
                </div>
              </button>
              {!mergeMode && (
                <div className="flex gap-1 shrink-0">
                  <Link
                    href={`/${store}/edit/${item.id}`}
                    className="h-12 w-12 flex items-center justify-center rounded-lg hover:bg-slate-100"
                    aria-label={`Edit ${item.name}`}
                  >
                    ✏️
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id, item.name)}
                    disabled={isPending}
                    className="h-12 w-12 flex items-center justify-center rounded-lg hover:bg-red-50 disabled:opacity-50"
                    aria-label={`Delete ${item.name}`}
                  >
                    🗑️
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {mergeOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 flex items-end sm:items-center justify-center p-4"
          onClick={() => !isPending && setMergeOpen(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md p-5 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h2 className="text-xl font-bold">Merge {selectedItems.length} items</h2>
            <p className="text-sm text-muted">
              Pick the name to keep. Quantities will be added together.
            </p>

            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
              {Array.from(new Set(selectedItems.map((i) => i.name))).map((name) => (
                <label
                  key={name}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-sky-50"
                >
                  <input
                    type="radio"
                    name="canonical"
                    value={name}
                    checked={canonicalName === name}
                    onChange={() => setCanonicalName(name)}
                    className="h-5 w-5 accent-primary"
                  />
                  <span className="font-medium">{name}</span>
                </label>
              ))}
            </div>

            <div className="text-sm text-muted">
              Total quantity:{" "}
              <span className="font-semibold text-foreground">
                {selectedItems.reduce((s, i) => s + i.quantity, 0)}
              </span>
            </div>

            {mergeError && (
              <p className="text-danger text-sm" role="alert">
                {mergeError}
              </p>
            )}

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => setMergeOpen(false)}
                disabled={isPending}
                className="flex-1 h-12 rounded-xl bg-white border border-border font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmMerge}
                disabled={isPending || !canonicalName}
                className="flex-1 h-12 rounded-xl bg-primary text-white font-semibold disabled:opacity-50"
              >
                {isPending ? "Merging…" : "Merge"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
