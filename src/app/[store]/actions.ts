"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isValidStoreSlug } from "@/lib/store";
import {
  CreateItemSchema,
  UpdateItemSchema,
  MergeItemsSchema,
} from "@/lib/validation";
import { createItem, updateItem, deleteItem, mergeItems, MergeError } from "@/lib/items";

function assertStore(store: string): void {
  if (!isValidStoreSlug(store)) {
    throw new Error("Invalid store");
  }
}

type AmountUnitParse =
  | { error: string }
  | { value: { amount: string | undefined; unit: string | undefined } };

function parseAmountUnit(formData: FormData): AmountUnitParse {
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const unitRaw = String(formData.get("unit") ?? "").trim();
  const hasAmount = amountRaw !== "";
  const hasUnit = unitRaw !== "";
  if (hasAmount !== hasUnit) {
    return { error: "Amount and unit must be set together" };
  }
  if (!hasAmount) return { value: { amount: undefined, unit: undefined } };
  return { value: { amount: amountRaw, unit: unitRaw } };
}

export async function createItemAction(
  store: string,
  formData: FormData,
): Promise<{ ok: true; addAnother: boolean } | { ok: false; error: string }> {
  assertStore(store);
  const au = parseAmountUnit(formData);
  if ("error" in au) return { ok: false, error: au.error };

  const parsed = CreateItemSchema.safeParse({
    name: formData.get("name"),
    quantity: formData.get("quantity"),
    ...au.value,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await createItem(store, parsed.data);
  revalidatePath(`/${store}/report`);

  const addAnother = formData.get("intent") === "add_another";
  return { ok: true, addAnother };
}

export async function updateItemAction(
  store: string,
  id: string,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  assertStore(store);
  const au = parseAmountUnit(formData);
  if ("error" in au) return { ok: false, error: au.error };

  const parsed = UpdateItemSchema.safeParse({
    name: formData.get("name"),
    quantity: formData.get("quantity"),
    ...au.value,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const updated = await updateItem(store, id, parsed.data);
  if (!updated) {
    return { ok: false, error: "Item not found" };
  }
  revalidatePath(`/${store}/report`);
  return { ok: true };
}

export async function deleteItemAction(store: string, id: string): Promise<void> {
  assertStore(store);
  await deleteItem(store, id);
  revalidatePath(`/${store}/report`);
}

export async function mergeItemsAction(
  store: string,
  ids: string[],
  canonicalName: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  assertStore(store);
  const parsed = MergeItemsSchema.safeParse({ ids, canonicalName });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  try {
    await mergeItems(store, parsed.data.ids, parsed.data.canonicalName);
  } catch (err) {
    if (err instanceof MergeError) return { ok: false, error: err.message };
    throw err;
  }
  revalidatePath(`/${store}/report`);
  return { ok: true };
}

export async function leaveStoreAction(): Promise<void> {
  const { clearStoreCookie } = await import("@/lib/store");
  await clearStoreCookie();
  redirect("/?switch=1");
}
