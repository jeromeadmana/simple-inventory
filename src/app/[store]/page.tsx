import Link from "next/link";

export default async function StoreHome({
  params,
}: {
  params: Promise<{ store: string }>;
}) {
  const { store } = await params;

  return (
    <main className="flex flex-col landscape:flex-row gap-4 pt-4 landscape:pt-2">
      <Link
        href={`/${store}/add`}
        className="h-20 landscape:h-32 landscape:flex-1 rounded-2xl bg-primary text-white font-bold text-2xl flex items-center justify-center hover:bg-primary-hover active:scale-[0.99] transition shadow-sm"
      >
        + Add Item
      </Link>
      <Link
        href={`/${store}/report`}
        className="h-20 landscape:h-32 landscape:flex-1 rounded-2xl bg-white border-2 border-primary text-primary font-bold text-2xl flex items-center justify-center hover:bg-sky-50 active:scale-[0.99] transition"
      >
        View Report
      </Link>
    </main>
  );
}
