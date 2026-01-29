"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  FileText,
  Loader2,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

import { api } from "@/lib/api";
import type { Claim, ClaimAiVersion, ClaimStatus } from "@/lib/types";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import { AttachmentThumbnailCanvas } from "@/components/attachment-thumbnail-canvas";

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

const triageLabels: Record<ClaimAiVersion["response"]["triage"], string> = {
  FAST_TRACK: "Fast track",
  ADJUSTER_REVIEW: "Adjuster review",
  FRAUD_REVIEW: "Fraud review",
};

const triageVariant: Record<ClaimAiVersion["response"]["triage"], "success" | "secondary" | "outline"> = {
  FAST_TRACK: "success",
  ADJUSTER_REVIEW: "secondary",
  FRAUD_REVIEW: "outline",
};

export default function ClaimDetailPage() {
  const params = useParams<{ id: string }>();
  const claimId = Array.isArray(params?.id) ? params?.id[0] : params?.id;

  const [claim, setClaim] = React.useState<Claim | null>(null);
  const [latestAi, setLatestAi] = React.useState<ClaimAiVersion | null>(null);
  const [history, setHistory] = React.useState<ClaimAiVersion[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [generating, setGenerating] = React.useState(false);

  const loadData = React.useCallback(async () => {
    if (!claimId) return;
    setLoading(true);
    setError(null);

    try {
      const [claimResponse, aiResponse] = await Promise.all([
        api.getClaim(claimId),
        api.getClaimAi(claimId),
      ]);

      setClaim(claimResponse.claim);
      setLatestAi(aiResponse.latest ?? claimResponse.latestAi);
      setHistory(aiResponse.history);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load claim.");
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerate = async () => {
    if (!claimId) return;
    setGenerating(true);
    try {
      const version = await api.generateAi(claimId);
      setLatestAi(version);
      setHistory((prev) => [version, ...prev.filter((item) => item.id !== version.id)]);
      toast.success("AI summary regenerated", {
        description: "Latest guidance has been added to the history.",
      });
      const refreshed = await api.getClaimAi(claimId);
      setLatestAi(refreshed.latest ?? version);
      setHistory(refreshed.history);
    } catch (err) {
      toast.error("AI generation failed", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Skeleton className="h-[420px] w-full" />
          <Skeleton className="h-[420px] w-full" />
        </div>
      </div>
    );
  }

  if (error || !claim) {
    return (
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <TriangleAlert className="h-4 w-4" aria-hidden="true" />
            Unable to load claim
          </CardTitle>
          <CardDescription>{error ?? "Claim not found."}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={loadData}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href="/claims" aria-label="Back to claims">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <div>
            <p className="text-sm text-muted-foreground">Claim ID</p>
            <h1 className="text-2xl font-semibold tracking-tight">
              {claim.policyNumber}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={statusVariant[claim.status]}>
            {statusLabels[claim.status]}
          </Badge>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            )}
            Regenerate AI
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Card className="animate-fade-up motion-reduce:animate-none">
            <CardHeader>
              <CardTitle>Claim Overview</CardTitle>
              <CardDescription>
                Core details and coverage context for adjusters.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Claim type
                </p>
                <p className="text-base font-semibold">
                  {claim.claimType.toUpperCase()}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Incident date
                </p>
                <p className="text-base font-semibold tabular-nums">
                  {formatDate(claim.incidentDate)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Location
                </p>
                <p className="text-base font-semibold">{claim.location}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Estimated amount
                </p>
                <p className="text-base font-semibold tabular-nums">
                  {formatCurrency(claim.estimatedAmount)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Created
                </p>
                <p className="text-base font-semibold tabular-nums">
                  {formatDate(claim.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Updated
                </p>
                <p className="text-base font-semibold tabular-nums">
                  {formatDate(claim.updatedAt)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="animate-fade-up-2 motion-reduce:animate-none">
            <CardHeader>
              <CardTitle>Loss Description</CardTitle>
              <CardDescription>
                Narrative shared with AI triage and adjusters.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground/90 leading-relaxed">
                {claim.description}
              </p>
            </CardContent>
          </Card>

          <Card className="animate-fade-up-2 motion-reduce:animate-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                Latest AI Guidance
              </CardTitle>
              <CardDescription>
                AI runs only when you click regenerate.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {latestAi ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={triageVariant[latestAi.response.triage]}>
                      {triageLabels[latestAi.response.triage]}
                    </Badge>
                    <Badge variant="outline">v{latestAi.promptVersion}</Badge>
                    <Badge variant="secondary">
                      Confidence {(latestAi.response.confidence * 100).toFixed(0)}%
                    </Badge>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Summary
                    </p>
                    <ul className="mt-2 space-y-1 text-sm">
                      {latestAi.response.summary_bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Rationale
                    </p>
                    <ul className="mt-2 space-y-1 text-sm">
                      {latestAi.response.rationale_bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-secondary" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Missing info questions
                    </p>
                    <ul className="mt-2 space-y-1 text-sm">
                      {latestAi.response.missing_info_questions.map((question) => (
                        <li key={question} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-accent" />
                          <span>{question}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-lg border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2 tabular-nums">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      Generated {formatDate(latestAi.createdAt)} ·
                      {` ${latestAi.latencyMs}ms`}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                  No AI guidance yet. Generate to create the first summary.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="animate-fade-up-3 motion-reduce:animate-none">
            <CardHeader>
              <CardTitle>Attachments</CardTitle>
              <CardDescription>Evidence, receipts, and estimates.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {claim.attachments.map((attachment) => (
                  <Button
                    asChild
                    key={attachment}
                    variant="outline"
                    className="h-auto w-full justify-start p-3"
                  >
                    <a
                      href={attachment}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="flex w-full items-center gap-3"
                    >
                      <AttachmentThumbnailCanvas
                        url={attachment}
                        width={112}
                        height={76}
                        className="shrink-0"
                      />
                      <span className="min-w-0 flex-1 truncate text-left text-sm">
                        {attachment}
                      </span>
                      <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    </a>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="animate-fade-up-2 motion-reduce:animate-none">
            <CardHeader>
              <CardTitle>AI History</CardTitle>
              <CardDescription>
                Previous AI outputs, newest first.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                  History appears after the first regeneration.
                </div>
              ) : (
                <Accordion type="single" collapsible className="w-full">
                  {history.map((version) => (
                    <AccordionItem value={version.id} key={version.id}>
                      <AccordionTrigger>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={triageVariant[version.response.triage]}>
                            {triageLabels[version.response.triage]}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(version.createdAt)} · v{version.promptVersion}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 text-sm">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              Summary
                            </p>
                            <ul className="mt-1 space-y-1">
                              {version.response.summary_bullets.map((bullet) => (
                                <li key={bullet} className="flex items-start gap-2">
                                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                                  <span>{bullet}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              Rationale
                            </p>
                            <ul className="mt-1 space-y-1">
                              {version.response.rationale_bullets.map((bullet) => (
                                <li key={bullet} className="flex items-start gap-2">
                                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-secondary" />
                                  <span>{bullet}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              Missing info
                            </p>
                            <ul className="mt-1 space-y-1">
                              {version.response.missing_info_questions.map((question) => (
                                <li key={question} className="flex items-start gap-2">
                                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-accent" />
                                  <span>{question}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
