"use client";

import * as React from "react";
import Link from "next/link";
import { useQueryState } from "nuqs";
import {
  ArrowUpRight,
  Filter,
  Loader2,
  Search,
  Sparkles,
  TriangleAlert,
  TrendingUp,
} from "lucide-react";

import { api } from "@/lib/api";
import type {
  ClaimAiVersion,
  ClaimStatus,
  ClaimSummary,
  ClaimType,
} from "@/lib/types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";

type TriageBucket =
  | ClaimAiVersion["response"]["triage"]
  | "UNASSIGNED";

const triageLabels: Record<TriageBucket, string> = {
  FAST_TRACK: "Fast track",
  ADJUSTER_REVIEW: "Needs review",
  FRAUD_REVIEW: "Fraud review",
  UNASSIGNED: "Awaiting triage",
};

const triageVariant: Record<
  TriageBucket,
  "success" | "secondary" | "outline" | "muted"
> = {
  FAST_TRACK: "success",
  ADJUSTER_REVIEW: "secondary",
  FRAUD_REVIEW: "outline",
  UNASSIGNED: "muted",
};

const triagePriority: Record<TriageBucket, number> = {
  FRAUD_REVIEW: 3,
  ADJUSTER_REVIEW: 2,
  FAST_TRACK: 1,
  UNASSIGNED: 0,
};

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

type TriageRow = {
  claim: ClaimSummary;
  latestAi: ClaimAiVersion | null;
  triage: TriageBucket;
  hasAiEntry: boolean;
};

const DEFAULT_LIMIT = 100;

export default function TriageListClient() {
  const [items, setItems] = React.useState<ClaimSummary[]>([]);
  const [aiByClaimId, setAiByClaimId] = React.useState<
    Record<string, ClaimAiVersion | null>
  >({});
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [aiLoading, setAiLoading] = React.useState(false);
  const [generating, setGenerating] = React.useState<Record<string, boolean>>(
    {}
  );
  const [bulkGenerating, setBulkGenerating] = React.useState(false);
  const [bulkProgress, setBulkProgress] = React.useState({ done: 0, total: 0 });
  const [isPending, startTransition] = React.useTransition();

  const [query, setQuery] = useQueryState("q");
  const [type, setType] = useQueryState("type");
  const [status, setStatus] = useQueryState("status");
  const [triage, setTriage] = useQueryState("triage");
  const [sort, setSort] = useQueryState("sort");

  const searchValue = query ?? "";
  const sortValue = sort ?? "priority";
  const triageValue = triage ?? "all";

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    api
      .listClaims({
        q: query ?? undefined,
        type: (type as ClaimType | null) ?? undefined,
        status: (status as ClaimStatus | null) ?? undefined,
        limit: DEFAULT_LIMIT,
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

  React.useEffect(() => {
    let active = true;
    if (items.length === 0) {
      setAiByClaimId({});
      return;
    }

    setAiLoading(true);

    Promise.all(
      items.map(async (claim) => {
        try {
          const response = await api.getClaimAi(claim.id);
          return { id: claim.id, latest: response.latest };
        } catch (err) {
          return { id: claim.id, latest: null };
        }
      })
    )
      .then((entries) => {
        if (!active) return;
        const nextMap: Record<string, ClaimAiVersion | null> = {};
        for (const entry of entries) {
          nextMap[entry.id] = entry.latest;
        }
        setAiByClaimId(nextMap);
      })
      .finally(() => {
        if (!active) return;
        setAiLoading(false);
      });

    return () => {
      active = false;
    };
  }, [items]);

  const rows = React.useMemo<TriageRow[]>(() => {
    return items.map((claim) => {
      const hasAiEntry = Object.prototype.hasOwnProperty.call(
        aiByClaimId,
        claim.id
      );
      const latestAi = hasAiEntry ? aiByClaimId[claim.id] : null;
      const triageBucket = latestAi?.response.triage ?? "UNASSIGNED";
      return { claim, latestAi, triage: triageBucket, hasAiEntry };
    });
  }, [aiByClaimId, items]);

  const visibleRows = React.useMemo(() => {
    const filtered =
      triageValue === "all"
        ? rows
        : rows.filter((row) => row.triage === triageValue);

    const sorted = filtered.toSorted((a, b) => {
      if (sortValue === "amount-asc") {
        return a.claim.estimatedAmount - b.claim.estimatedAmount;
      }
      if (sortValue === "amount-desc") {
        return b.claim.estimatedAmount - a.claim.estimatedAmount;
      }
      if (sortValue === "oldest") {
        return (
          new Date(a.claim.createdAt).getTime() -
          new Date(b.claim.createdAt).getTime()
        );
      }
      if (sortValue === "newest") {
        return (
          new Date(b.claim.createdAt).getTime() -
          new Date(a.claim.createdAt).getTime()
        );
      }

      const priorityDelta =
        triagePriority[b.triage] - triagePriority[a.triage];
      if (priorityDelta !== 0) return priorityDelta;
      return (
        new Date(b.claim.createdAt).getTime() -
        new Date(a.claim.createdAt).getTime()
      );
    });

    return sorted;
  }, [rows, sortValue, triageValue]);

  const stats = React.useMemo(() => {
    const total = rows.length;
    const fastTrack = rows.filter((row) => row.triage === "FAST_TRACK").length;
    const adjuster = rows.filter((row) => row.triage === "ADJUSTER_REVIEW")
      .length;
    const fraud = rows.filter((row) => row.triage === "FRAUD_REVIEW").length;
    const unassigned = rows.filter((row) => row.triage === "UNASSIGNED").length;

    return { total, fastTrack, adjuster, fraud, unassigned };
  }, [rows]);

  const hasAnyAi = React.useMemo(
    () => rows.some((row) => Boolean(row.latestAi)),
    [rows]
  );

  const handleBulkTriage = async () => {
    const targets = rows.map((row) => row.claim.id);

    if (targets.length === 0) {
      toast("No claims to triage", {
        description: "Adjust your filters or load more claims.",
      });
      return;
    }

    setBulkGenerating(true);
    setBulkProgress({ done: 0, total: targets.length });

    let successCount = 0;
    const failed: string[] = [];

    for (const claimId of targets) {
      try {
        const version = await api.generateAi(claimId);
        setAiByClaimId((prev) => ({ ...prev, [claimId]: version }));
        successCount += 1;
      } catch {
        failed.push(claimId);
      } finally {
        setBulkProgress((prev) => ({
          ...prev,
          done: Math.min(prev.done + 1, prev.total),
        }));
      }
    }

    if (failed.length === 0) {
      toast.success("AI triage complete", {
        description: `${successCount} claims sorted into priority lanes.`,
      });
    } else {
      toast.error("Some triage calls failed", {
        description: `${successCount} succeeded, ${failed.length} failed.`,
      });
    }

    setBulkGenerating(false);
    setBulkProgress({ done: 0, total: 0 });
  };

  const handleGenerate = async (claimId: string) => {
    setGenerating((prev) => ({ ...prev, [claimId]: true }));
    try {
      const version = await api.generateAi(claimId);
      setAiByClaimId((prev) => ({ ...prev, [claimId]: version }));
      toast.success("Triage refreshed", {
        description: "Latest AI triage is now visible in the queue.",
      });
    } catch (err) {
      toast.error("Unable to generate triage", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setGenerating((prev) => ({ ...prev, [claimId]: false }));
    }
  };

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-4 animate-fade-up motion-reduce:animate-none">
          <Badge variant="secondary" className="w-fit">
            Employee Triage
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-balance">
            Sort every incoming claim into the right priority lane.
          </h1>
          <p className="text-base text-muted-foreground max-w-xl">
            Review the AI triage bucket, confidence, and claim value so you can
            decide what needs deeper investigation first.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild className="shadow-soft">
              <Link href="/claims">
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                Claims overview
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/claims/new">Start a claim</Link>
            </Button>
          </div>
        </div>

        <Card className="animate-fade-up-2 motion-reduce:animate-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
              Priority lanes
            </CardTitle>
            <CardDescription>
              Live triage distribution across the desk.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/50 px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Fraud review
                </p>
                <p className="text-2xl font-semibold tabular-nums">
                  {stats.fraud}
                </p>
              </div>
              <Badge variant="outline">Highest risk</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/50 px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Needs review
                </p>
                <p className="text-2xl font-semibold tabular-nums">
                  {stats.adjuster}
                </p>
              </div>
              <Badge variant="secondary">Adjuster</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/50 px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Fast track
                </p>
                <p className="text-2xl font-semibold tabular-nums">
                  {stats.fastTrack}
                </p>
              </div>
              <Badge variant="success">Low risk</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-dashed border-border/70 bg-white/70 px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Awaiting triage
                </p>
                <p className="text-2xl font-semibold tabular-nums">
                  {stats.unassigned}
                </p>
              </div>
              <Badge variant="muted">Pending</Badge>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="animate-fade-up-2 motion-reduce:animate-none">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Triage Queue</CardTitle>
            <CardDescription>
              Sort by priority and focus on the riskiest claims first.
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-4 sm:w-auto sm:min-w-[420px]">
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Button
                className="w-full sm:w-auto"
                onClick={handleBulkTriage}
                disabled={
                  bulkGenerating || loading || aiLoading || rows.length === 0
                }
              >
                {bulkGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                )}
              {bulkGenerating && bulkProgress.total > 0
                ? `Triaging ${bulkProgress.done}/${bulkProgress.total}`
                : hasAnyAi
                  ? "Re-run AI triage"
                  : "Run AI triage"}
            </Button>
              <div className="relative w-full sm:w-60">
                <Search
                  className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  type="search"
                  value={searchValue}
                  onChange={(event) =>
                    setQuery(
                      event.target.value.trim() ? event.target.value : null
                    )
                  }
                  placeholder="Search policy or location"
                  autoComplete="off"
                  name="triage-search"
                  className="pl-9"
                  aria-label="Search claims"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Select
                value={triageValue}
                onValueChange={(value) =>
                  setTriage(value === "all" ? null : value)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Triage lane" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All lanes</SelectItem>
                  <SelectItem value="FRAUD_REVIEW">Fraud review</SelectItem>
                  <SelectItem value="ADJUSTER_REVIEW">Needs review</SelectItem>
                  <SelectItem value="FAST_TRACK">Fast track</SelectItem>
                  <SelectItem value="UNASSIGNED">Awaiting triage</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={type ?? "all"}
                onValueChange={(value) =>
                  setType(value === "all" ? null : value)
                }
              >
                <SelectTrigger className="w-full" aria-label="Filter by claim type">
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
                <SelectTrigger className="w-full" aria-label="Filter by status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="NEW">New</SelectItem>
                  <SelectItem value="IN_REVIEW">In review</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={sortValue}
                onValueChange={(value) =>
                  setSort(value === "priority" ? null : value)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="priority">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" aria-hidden="true" />
                      Priority
                    </div>
                  </SelectItem>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                  <SelectItem value="amount-desc">Amount (high → low)</SelectItem>
                  <SelectItem value="amount-asc">Amount (low → high)</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                    <TableHead>Amount</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading || isPending ? (
                    Array.from({ length: 6 }).map((_, index) => (
                      <TableRow key={`skeleton-${index}`}>
                        <TableCell colSpan={8}>
                          <Skeleton className="h-9 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : visibleRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center">
                        <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                          <TriangleAlert
                            className="h-5 w-5"
                            aria-hidden="true"
                          />
                          No claims match the current filters.
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleRows.map((row) => {
                      const { claim, latestAi, triage: bucket, hasAiEntry } =
                        row;
                      const isGenerating = Boolean(generating[claim.id]);
                      const isAiPending = aiLoading && !hasAiEntry;

                      return (
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
                            {formatCurrency(claim.estimatedAmount)}
                          </TableCell>
                          <TableCell>
                            {isAiPending ? (
                              <Skeleton className="h-6 w-24" />
                            ) : (
                              <Badge variant={triageVariant[bucket]}>
                                {triageLabels[bucket]}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {latestAi ? (
                              `${(latestAi.response.confidence * 100).toFixed(0)}%`
                            ) : (
                              "—"
                            )}
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
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                              >
                                <Link href={`/claims/${claim.id}`}>
                                  View
                                  <ArrowUpRight
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                  />
                                </Link>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleGenerate(claim.id)}
                                disabled={isGenerating}
                              >
                                {isGenerating ? (
                                  <Loader2
                                    className="h-4 w-4 animate-spin"
                                    aria-hidden="true"
                                  />
                                ) : (
                                  <Sparkles
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                  />
                                )}
                                {latestAi ? "Refresh" : "Triage"}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
