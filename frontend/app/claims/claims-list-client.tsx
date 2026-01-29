"use client";

import * as React from "react";
import Link from "next/link";
import { useQueryState } from "nuqs";
import {
  ArrowUpRight,
  ClipboardList,
  Filter,
  PlusCircle,
  Search,
  TrendingUp,
} from "lucide-react";

import { api } from "@/lib/api";
import type { ClaimSummary, ClaimType, ClaimStatus } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

const statusLabels: Record<ClaimStatus, string> = {
  NEW: "New",
  IN_REVIEW: "In review",
  RESOLVED: "Resolved",
};

const statusVariant: Record<ClaimStatus, "secondary" | "success" | "outline"> = {
  NEW: "secondary",
  IN_REVIEW: "outline",
  RESOLVED: "success",
};

const typeLabels: Record<ClaimType, string> = {
  auto: "Auto",
  home: "Home",
  travel: "Travel",
};

export default function ClaimsListClient() {
  const [items, setItems] = React.useState<ClaimSummary[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isPending, startTransition] = React.useTransition();

  const [query, setQuery] = useQueryState("q");
  const [type, setType] = useQueryState("type");
  const [status, setStatus] = useQueryState("status");

  const searchValue = query ?? "";

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    api
      .listClaims({
        q: query ?? undefined,
        type: (type as ClaimType | null) ?? undefined,
        status: (status as ClaimStatus | null) ?? undefined,
      })
      .then((response) => {
        if (!active) return;
        startTransition(() => {
          setItems(response.items);
        });
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load claims.");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [query, status, type]);

  const stats = React.useMemo(() => {
    const total = items.length;
    const inReview = items.filter((item) => item.status === "IN_REVIEW").length;
    const totalExposure = items.reduce(
      (sum, item) => sum + item.estimatedAmount,
      0
    );
    return { total, inReview, totalExposure };
  }, [items]);

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-4 animate-fade-up motion-reduce:animate-none">
          <Badge variant="secondary" className="w-fit">
            Claims Workspace
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-balance">
            Monitor Every Claim With a Clear Triage Lane and Accountable Next Step.
          </h1>
          <p className="text-base text-muted-foreground max-w-xl">
            Filter by type, status, or keyword and open a claim to review
            timeline, attachments, and the latest AI guidance.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild className="shadow-soft">
              <Link href="/claims/new">
                <PlusCircle className="h-4 w-4" aria-hidden="true" />
                Start a Claim
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/claims/triage">
                <Filter className="h-4 w-4" aria-hidden="true" />
                Employee triage
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/claims/new">Quick Intake Guide</Link>
            </Button>
          </div>
        </div>

        <Card className="animate-fade-up-2 motion-reduce:animate-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
              Snapshot
            </CardTitle>
            <CardDescription>
              Live overview from the current filter set.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/50 px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Claims visible
                </p>
                <p className="text-2xl font-semibold tabular-nums">
                  {stats.total}
                </p>
              </div>
              <ClipboardList className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/50 px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  In review
                </p>
                <p className="text-2xl font-semibold tabular-nums">
                  {stats.inReview}
                </p>
              </div>
              <Filter className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/50 px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Total exposure
                </p>
                <p className="text-2xl font-semibold tabular-nums">
                  {formatCurrency(stats.totalExposure)}
                </p>
              </div>
              <ArrowUpRight className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="animate-fade-up-2 motion-reduce:animate-none">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Claims Pipeline</CardTitle>
            <CardDescription>
              Search by policy or location and narrow by claim type.
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <div className="relative w-full sm:w-60">
              <Search
                className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                value={searchValue}
                onChange={(event) =>
                  setQuery(event.target.value.trim() ? event.target.value : null)
                }
                placeholder="Search policy or location"
                autoComplete="off"
                name="claim-search"
                className="pl-9"
                aria-label="Search claims"
              />
            </div>
            <Select
              value={type ?? "all"}
              onValueChange={(value) =>
                setType(value === "all" ? null : value)
              }
            >
              <SelectTrigger
                className="w-full sm:w-[160px]"
                aria-label="Filter by claim type"
              >
                <SelectValue placeholder="Claim type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="home">Home</SelectItem>
                <SelectItem value="travel">Travel</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={status ?? "all"}
              onValueChange={(value) =>
                setStatus(value === "all" ? null : value)
              }
            >
              <SelectTrigger
                className="w-full sm:w-[160px]"
                aria-label="Filter by status"
              >
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="NEW">New</SelectItem>
                <SelectItem value="IN_REVIEW">In review</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Policy</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Incident</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading || isPending
                    ? Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={`skeleton-${index}`}>
                          <TableCell colSpan={7}>
                            <Skeleton className="h-9 w-full" />
                          </TableCell>
                        </TableRow>
                      ))
                    : items.map((claim) => (
                        <TableRow key={claim.id}>
                          <TableCell className="font-semibold">
                            <Link
                              className="rounded-sm transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                              href={`/claims/${claim.id}`}
                            >
                              {claim.policyNumber}
                            </Link>
                          </TableCell>
                          <TableCell>{typeLabels[claim.claimType]}</TableCell>
                          <TableCell className="tabular-nums">
                            {formatDate(claim.incidentDate)}
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {formatCurrency(claim.estimatedAmount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariant[claim.status]}>
                              {statusLabels[claim.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {formatDate(claim.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button asChild variant="ghost" size="sm">
                              <Link href={`/claims/${claim.id}`}>
                                View
                                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>

              {!loading && items.length === 0 && (
                <Card className="border-dashed">
                  <CardHeader>
                    <CardTitle>No claims found</CardTitle>
                    <CardDescription>
                      Try clearing filters or start a new claim intake.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild>
                      <Link href="/claims/new">Create a claim</Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
