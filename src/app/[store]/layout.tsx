import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidStoreSlug } from "@/lib/store";
import { leaveStoreAction } from "./actions";
import BackButton from "./BackButton";

export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ store: string }>;
}) {
  const { store } = await params;
  if (!isValidStoreSlug(store)) notFound();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-md landscape:max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0">
            <BackButton store={store} />
            <Link href={`/${store}`} className="font-bold text-lg truncate">
              {store}
            </Link>
          </div>
          <form action={leaveStoreAction}>
            <button type="submit" className="text-sm text-muted hover:text-foreground">
              Change store
            </button>
          </form>
        </div>
      </header>
      <div className="flex-1 max-w-md landscape:max-w-2xl w-full mx-auto px-4 py-6 landscape:py-3">
        {children}
      </div>
    </div>
  );
}
