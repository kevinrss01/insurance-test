import Link from "next/link";
import { ShieldCheck, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const apiMode = process.env.NEXT_PUBLIC_API_MODE ?? "mock";

export default function ClaimsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_10%_-10%,rgba(14,165,233,0.25),transparent),radial-gradient(900px_500px_at_90%_0%,rgba(34,197,94,0.18),transparent)]" />

      <div className="relative z-10">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary focus:shadow-soft"
        >
          Skip to content
        </a>
        <header className="sticky top-0 z-30 border-b border-border/70 bg-white/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-soft">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/70">
                  Opal
                </p>
                <p className="text-lg font-semibold">Claims Desk</p>
              </div>
              <Badge
                variant={apiMode === "live" ? "success" : "secondary"}
                className="hidden sm:inline-flex"
              >
                {apiMode === "live" ? "Live API" : "Mock Data"}
              </Badge>
            </div>

            <nav className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/claims">Claims</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/claims/triage">Triage</Link>
              </Button>
              <Button asChild size="sm" className="shadow-soft">
                <Link href="/claims/new">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  New Claim
                </Link>
              </Button>
            </nav>
          </div>
        </header>

        <main
          id="main-content"
          className={cn("mx-auto w-full max-w-6xl px-4 pb-16 pt-8")}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
