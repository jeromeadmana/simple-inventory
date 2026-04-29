import { redirect } from "next/navigation";
import { getStoreFromCookie, normalizeStoreName, isValidStoreSlug, setStoreCookie } from "@/lib/store";
import { StoreNameSchema } from "@/lib/validation";

async function enterStore(formData: FormData): Promise<void> {
  "use server";
  const raw = String(formData.get("storeName") ?? "");
  const parsed = StoreNameSchema.safeParse(raw);
  if (!parsed.success) {
    redirect(`/?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid name")}`);
  }
  const slug = normalizeStoreName(parsed.data);
  if (!isValidStoreSlug(slug)) {
    redirect(`/?error=${encodeURIComponent("Use letters, numbers, and dashes only")}`);
  }
  await setStoreCookie(slug);
  redirect(`/${slug}`);
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; switch?: string }>;
}) {
  const params = await searchParams;
  const existing = await getStoreFromCookie();
  if (existing && !params.switch) {
    redirect(`/${existing}`);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2">Simple Inventory</h1>
        <p className="text-center text-muted mb-8">Enter your store name to start</p>

        <form action={enterStore} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="font-medium">Store name</span>
            <input
              name="storeName"
              type="text"
              required
              autoFocus
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              maxLength={50}
              placeholder="e.g. mark-store"
              className="h-14 px-4 rounded-xl border border-border bg-white focus:outline-none focus:ring-4 focus:ring-primary/30 focus:border-primary"
            />
          </label>

          {params.error && (
            <p className="text-danger text-sm" role="alert">
              {params.error}
            </p>
          )}

          <button
            type="submit"
            className="h-14 rounded-xl bg-primary text-white font-semibold text-lg hover:bg-primary-hover active:scale-[0.99] transition"
          >
            Enter
          </button>

          <p className="text-xs text-muted text-center mt-2">
            No password — anyone with the same store name shares this list.
          </p>
        </form>
      </div>
    </main>
  );
}
