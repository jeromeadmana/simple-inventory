import { notFound } from "next/navigation";
import { getItem } from "@/lib/items";
import EditItemForm from "./EditItemForm";

export const dynamic = "force-dynamic";

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ store: string; id: string }>;
}) {
  const { store, id } = await params;
  const item = await getItem(store, id);
  if (!item) notFound();

  return (
    <EditItemForm
      store={store}
      id={item.id}
      initial={{
        name: item.name,
        quantity: item.quantity,
        amount: item.amount === null ? null : Number(item.amount),
        unit: item.unit,
      }}
    />
  );
}
