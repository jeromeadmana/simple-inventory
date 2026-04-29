import Link from "next/link";
import { listItems } from "@/lib/items";
import ReportClient from "./ReportClient";

export const dynamic = "force-dynamic";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ store: string }>;
}) {
  const { store } = await params;
  const items = await listItems(store);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Report</h1>
        <Link
          href={`/${store}/add`}
          className="h-10 px-4 rounded-lg bg-primary text-white font-semibold flex items-center"
        >
          + Add
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-muted text-center py-12">
          No items yet. Tap <span className="font-semibold">+ Add</span> to start.
        </p>
      ) : (
        <ReportClient
          store={store}
          items={items.map((i) => ({
            id: i.id,
            name: i.name,
            quantity: i.quantity,
            amount: i.amount === null ? null : Number(i.amount),
            unit: i.unit,
          }))}
        />
      )}
    </div>
  );
}
