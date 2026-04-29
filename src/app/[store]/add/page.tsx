import AddItemForm from "./AddItemForm";

export default async function AddItemPage({
  params,
}: {
  params: Promise<{ store: string }>;
}) {
  const { store } = await params;
  return <AddItemForm store={store} />;
}
