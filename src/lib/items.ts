import { sql } from "./db";
import type { CreateItemInput, UpdateItemInput, Unit } from "./validation";

export type Item = {
  id: string;
  store_name: string;
  name: string;
  quantity: number;
  amount: string | null;
  unit: Unit | null;
  created_at: Date;
  updated_at: Date;
};

export class MergeError extends Error {
  constructor(message: string, readonly code: "MISMATCH" | "NOT_FOUND" | "WRONG_STORE") {
    super(message);
    this.name = "MergeError";
  }
}

export async function listItems(storeName: string): Promise<Item[]> {
  const rows = await sql<Item[]>`
    SELECT id, store_name, name, quantity, amount, unit, created_at, updated_at
    FROM simpinv_items
    WHERE lower(store_name) = lower(${storeName})
    ORDER BY lower(name) ASC, created_at ASC
  `;
  return rows;
}

export async function getItem(storeName: string, id: string): Promise<Item | null> {
  const rows = await sql<Item[]>`
    SELECT id, store_name, name, quantity, amount, unit, created_at, updated_at
    FROM simpinv_items
    WHERE id = ${id} AND lower(store_name) = lower(${storeName})
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function createItem(storeName: string, input: CreateItemInput): Promise<Item> {
  const amount = "amount" in input ? input.amount ?? null : null;
  const unit = "unit" in input ? input.unit ?? null : null;
  const rows = await sql<Item[]>`
    INSERT INTO simpinv_items (store_name, name, quantity, amount, unit)
    VALUES (${storeName}, ${input.name.trim()}, ${input.quantity}, ${amount}, ${unit})
    RETURNING id, store_name, name, quantity, amount, unit, created_at, updated_at
  `;
  return rows[0];
}

export async function updateItem(
  storeName: string,
  id: string,
  input: UpdateItemInput,
): Promise<Item | null> {
  const amount = "amount" in input ? input.amount ?? null : null;
  const unit = "unit" in input ? input.unit ?? null : null;
  const rows = await sql<Item[]>`
    UPDATE simpinv_items
    SET name = ${input.name.trim()},
        quantity = ${input.quantity},
        amount = ${amount},
        unit = ${unit}
    WHERE id = ${id} AND lower(store_name) = lower(${storeName})
    RETURNING id, store_name, name, quantity, amount, unit, created_at, updated_at
  `;
  return rows[0] ?? null;
}

export async function deleteItem(storeName: string, id: string): Promise<boolean> {
  const rows = await sql<{ id: string }[]>`
    DELETE FROM simpinv_items
    WHERE id = ${id} AND lower(store_name) = lower(${storeName})
    RETURNING id
  `;
  return rows.length > 0;
}

export async function mergeItems(
  storeName: string,
  ids: string[],
  canonicalName: string,
): Promise<Item> {
  return await sql.begin(async (tx) => {
    const rows = await tx<Item[]>`
      SELECT id, store_name, name, quantity, amount, unit, created_at, updated_at
      FROM simpinv_items
      WHERE id IN ${tx(ids)} AND lower(store_name) = lower(${storeName})
      FOR UPDATE
    `;

    if (rows.length !== ids.length) {
      throw new MergeError(
        "Some items could not be found in this store. Refresh and try again.",
        "NOT_FOUND",
      );
    }

    const first = rows[0];
    const mismatch = rows.some(
      (r) =>
        (r.amount === null) !== (first.amount === null) ||
        (r.amount !== null && first.amount !== null && Number(r.amount) !== Number(first.amount)) ||
        r.unit !== first.unit,
    );

    if (mismatch) {
      throw new MergeError(
        "These items have different sizes or units. Please don't merge them.",
        "MISMATCH",
      );
    }

    const totalQty = rows.reduce((sum, r) => sum + r.quantity, 0);

    await tx`DELETE FROM simpinv_items WHERE id IN ${tx(ids)}`;

    const inserted = await tx<Item[]>`
      INSERT INTO simpinv_items (store_name, name, quantity, amount, unit)
      VALUES (${storeName}, ${canonicalName.trim()}, ${totalQty}, ${first.amount}, ${first.unit})
      RETURNING id, store_name, name, quantity, amount, unit, created_at, updated_at
    `;
    return inserted[0];
  }) as Item;
}
