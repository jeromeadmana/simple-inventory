"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BackButton({ store }: { store: string }) {
  const pathname = usePathname();
  const home = `/${store}`;

  if (pathname === home) return null;

  const target = pathname.startsWith(`${home}/edit/`) ? `${home}/report` : home;

  return (
    <Link
      href={target}
      aria-label="Back"
      className="h-10 w-10 -ml-2 flex items-center justify-center rounded-lg hover:bg-slate-100 text-2xl leading-none"
    >
      ←
    </Link>
  );
}
