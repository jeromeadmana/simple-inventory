import { readFile } from "node:fs/promises";
import postgres from "postgres";

async function loadEnv(): Promise<void> {
  const env = await readFile(".env.local", "utf8").catch(() => "");
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)="?([^"\r\n]+)"?/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

const TEST_STORE = "smoke-test-store";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    console.error(`  FAIL: ${msg}`);
    process.exit(1);
  } else {
    console.log(`  PASS: ${msg}`);
  }
}

async function main(): Promise<void> {
  await loadEnv();
  const { listItems, createItem, updateItem, deleteItem, mergeItems, MergeError } = await import(
    "../src/lib/items.ts"
  );

  const url = process.env.DATABASE_URL ?? process.env.DATABASE_URI;
  const cleanup = postgres(url!, { max: 1, ssl: "require", onnotice: () => {} });

  await cleanup`DELETE FROM simpinv_items WHERE lower(store_name) = ${TEST_STORE}`;
  console.log(`Cleared prior data for store=${TEST_STORE}`);

  console.log("\n[1] CREATE");
  const milo1 = await createItem(TEST_STORE, { name: "Milo", quantity: 12, amount: 13, unit: "g" });
  const milo2 = await createItem(TEST_STORE, { name: "milo", quantity: 5, amount: 13, unit: "g" });
  const lollipop = await createItem(TEST_STORE, { name: "Lollipop", quantity: 50 });
  const coke = await createItem(TEST_STORE, { name: "Coke", quantity: 6, amount: 0.5, unit: "L" });
  assert(milo1.id && milo2.id && lollipop.id && coke.id, "all 4 inserts returned ids");

  console.log("\n[2] LIST (alphabetical, case-insensitive)");
  const list = await listItems(TEST_STORE);
  assert(list.length === 4, `list returns 4 rows (got ${list.length})`);
  assert(list[0].name === "Coke", `first row is Coke (got ${list[0].name})`);
  assert(list[1].name === "Lollipop", `second row is Lollipop (got ${list[1].name})`);
  assert(list[2].name.toLowerCase() === "milo", `third is a Milo (got ${list[2].name})`);
  assert(list[3].name.toLowerCase() === "milo", `fourth is a Milo (got ${list[3].name})`);

  console.log("\n[3] STORE ISOLATION");
  const otherStore = "smoke-other-store";
  await cleanup`DELETE FROM simpinv_items WHERE lower(store_name) = ${otherStore}`;
  await createItem(otherStore, { name: "Other", quantity: 1 });
  const mine = await listItems(TEST_STORE);
  const theirs = await listItems(otherStore);
  assert(mine.length === 4 && theirs.length === 1, "stores are isolated");
  assert(!mine.some((i) => i.name === "Other"), "Other store data not visible here");

  console.log("\n[4] UPDATE");
  const updated = await updateItem(TEST_STORE, milo1.id, {
    name: "Milo",
    quantity: 20,
    amount: 13,
    unit: "g",
  });
  assert(updated && updated.quantity === 20, "quantity updated to 20");
  assert(updated && updated.updated_at.getTime() >= updated.created_at.getTime(), "updated_at >= created_at");

  console.log("\n[5] CROSS-STORE UPDATE BLOCKED");
  const blocked = await updateItem("non-existent-store", milo1.id, {
    name: "Hax",
    quantity: 999,
    amount: 13,
    unit: "g",
  });
  assert(blocked === null, "update with wrong store returns null (defense in depth)");
  const stillMilo = (await listItems(TEST_STORE)).find((i) => i.id === milo1.id);
  assert(stillMilo?.name === "Milo" && stillMilo?.quantity === 20, "row was not modified");

  console.log("\n[6] DELETE");
  const deleted = await deleteItem(TEST_STORE, lollipop.id);
  assert(deleted, "delete returns true");
  const afterDelete = await listItems(TEST_STORE);
  assert(afterDelete.length === 3, `3 rows remain after delete (got ${afterDelete.length})`);

  console.log("\n[7] CROSS-STORE DELETE BLOCKED");
  const notDeleted = await deleteItem("nope", milo1.id);
  assert(!notDeleted, "delete with wrong store returns false");

  console.log("\n[8] MERGE — happy path (two Milo @ 13g, qty 20 + 5)");
  const merged = await mergeItems(TEST_STORE, [milo1.id, milo2.id], "Milo");
  assert(merged.quantity === 25, `merged qty is 25 (got ${merged.quantity})`);
  assert(Number(merged.amount) === 13 && merged.unit === "g", "amount/unit preserved");
  const afterMerge = await listItems(TEST_STORE);
  assert(afterMerge.length === 2, `2 rows after merge (got ${afterMerge.length})`);
  assert(!afterMerge.some((i) => i.id === milo1.id || i.id === milo2.id), "originals deleted");

  console.log("\n[9] MERGE — blocked on amount mismatch (13g vs 22g)");
  const milo13 = await createItem(TEST_STORE, { name: "Milo", quantity: 1, amount: 13, unit: "g" });
  const milo22 = await createItem(TEST_STORE, { name: "Milo", quantity: 2, amount: 22, unit: "g" });
  let mismatchErr: unknown = null;
  try {
    await mergeItems(TEST_STORE, [milo13.id, milo22.id], "Milo");
  } catch (e) {
    mismatchErr = e;
  }
  assert(mismatchErr instanceof MergeError, "amount mismatch throws MergeError");
  assert(
    mismatchErr instanceof MergeError && mismatchErr.code === "MISMATCH",
    "MergeError code === MISMATCH",
  );

  console.log("\n[10] MERGE — blocked on unit mismatch (13g vs 13mL)");
  const miloMl = await createItem(TEST_STORE, { name: "Milo", quantity: 3, amount: 13, unit: "mL" });
  let unitErr: unknown = null;
  try {
    await mergeItems(TEST_STORE, [milo13.id, miloMl.id], "Milo");
  } catch (e) {
    unitErr = e;
  }
  assert(unitErr instanceof MergeError, "unit mismatch throws MergeError");

  console.log("\n[11] MERGE — null amount/unit pair allowed (Lollipop + Lollipop)");
  const lp1 = await createItem(TEST_STORE, { name: "Lollipop", quantity: 10 });
  const lp2 = await createItem(TEST_STORE, { name: "Lollipop", quantity: 5 });
  const lpMerged = await mergeItems(TEST_STORE, [lp1.id, lp2.id], "Lollipop");
  assert(lpMerged.quantity === 15, "merged null-amount lollipops sum to 15");
  assert(lpMerged.amount === null && lpMerged.unit === null, "amount/unit remain null");

  console.log("\n[12] MERGE — blocked when one has amount and other doesn't");
  const lpWithAmount = await createItem(TEST_STORE, { name: "Lollipop", quantity: 1, amount: 5, unit: "g" });
  const lpNoAmount = await createItem(TEST_STORE, { name: "Lollipop", quantity: 2 });
  let pairErr: unknown = null;
  try {
    await mergeItems(TEST_STORE, [lpWithAmount.id, lpNoAmount.id], "Lollipop");
  } catch (e) {
    pairErr = e;
  }
  assert(pairErr instanceof MergeError, "null vs non-null amount mismatch throws");

  console.log("\nCleanup");
  await cleanup`DELETE FROM simpinv_items WHERE lower(store_name) IN (${TEST_STORE}, ${otherStore})`;
  await cleanup.end({ timeout: 5 });

  console.log("\nALL SMOKE TESTS PASSED ✓");
}

main().catch((err) => {
  console.error("Smoke test failed:", err);
  process.exit(1);
});
