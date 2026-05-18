import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PlaceholderPageProps = {
  title: string;
  description: string;
};

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 text-slate-950">
      <section className="mx-auto w-full max-w-3xl rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium uppercase text-cyan-700">
          Travel Xchange placeholder
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-normal">{title}</h1>
        <p className="mt-4 text-base leading-7 text-slate-600">{description}</p>
        <Link
          className={cn(buttonVariants({ variant: "outline" }), "mt-8")}
          href="/"
        >
          Back to home
        </Link>
      </section>
    </main>
  );
}
