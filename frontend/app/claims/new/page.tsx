"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { CalendarIcon, Link as LinkIcon, Plus, PlusCircle, X } from "lucide-react";

import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "@/components/ui/sonner";

const formSchema = z.object({
  policyNumber: z.string().min(2, "Policy number is required."),
  claimType: z.enum(["auto", "home", "travel"], {
    required_error: "Select a claim type.",
  }),
  incidentDate: z.date({
    required_error: "Select an incident date.",
  }),
  location: z.string().min(2, "Location is required."),
  description: z
    .string()
    .min(20, "Description must be at least 20 characters.")
    .max(1000, "Description must be under 1000 characters."),
  estimatedAmount: z
    .string()
    .min(1, "Estimated amount is required.")
    .refine((value) => {
      const normalized = Number(value.replace(/,/g, ""));
      return Number.isFinite(normalized) && normalized > 0;
    }, "Enter a valid dollar amount."),
  attachments: z
    .array(z.string().url("Enter a valid URL."))
    .min(1, "Add at least one attachment URL."),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewClaimPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      policyNumber: "",
      claimType: "auto",
      incidentDate: undefined,
      location: "",
      description:
        "Overnight water leak from the kitchen sink saturated the cabinet base, warped the adjacent flooring, and caused the lower drywall to swell. Water was shut off by 7:30 AM, and no mold or electrical issues are visible yet. Initial mitigation included towel drying, a dehumidifier, and removal of the damaged toe kick. We need an assessment for cabinet replacement, flooring repair, and potential drywall patching.",
      estimatedAmount: "2450.00",
      attachments: [""],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "attachments",
  });

  const attachmentsError = form.formState.errors.attachments?.message as
    | string
    | undefined;

  const estimatedAmountValue = form.watch("estimatedAmount");

  const amountPreview = React.useMemo(() => {
    const raw = estimatedAmountValue;
    const numeric = Number(raw?.replace(/,/g, ""));
    if (!raw || !Number.isFinite(numeric)) return null;
    return formatCurrency(numeric);
  }, [estimatedAmountValue]);

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const payload = {
        policyNumber: values.policyNumber.trim(),
        claimType: values.claimType,
        incidentDate: format(values.incidentDate, "yyyy-MM-dd"),
        location: values.location.trim(),
        description: values.description.trim(),
        estimatedAmount: Number(values.estimatedAmount.replace(/,/g, "")),
        attachments: values.attachments.map((value) => value.trim()),
      };

      const created = await api.createClaim(payload);
      toast.success("Claim created", {
        description: `Claim ${created.policyNumber} is ready for review.`,
      });
      router.push(`/claims/${created.id}`);
    } catch (error) {
      toast.error("Unable to create claim", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <Card className="animate-fade-up motion-reduce:animate-none">
        <CardHeader>
          <CardTitle>New Claim Intake</CardTitle>
          <CardDescription>
            Capture the core facts so the adjuster and AI can triage quickly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="policyNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Policy Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="PN-12345"
                        autoComplete="off"
                        spellCheck={false}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="claimType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Claim Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a claim type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="auto">Auto</SelectItem>
                        <SelectItem value="home">Home</SelectItem>
                        <SelectItem value="travel">Travel</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="incidentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Incident Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                            {field.value
                              ? format(field.value, "PPP")
                              : "Select date"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Austin, TX" autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe what happened and any immediate impact."
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Minimum 20 characters. This is shared with adjusters and
                      AI triage.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estimatedAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="decimal"
                        placeholder="1250.50"
                        min="0"
                        step="0.01"
                        autoComplete="off"
                        spellCheck={false}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {amountPreview
                        ? `Preview: ${amountPreview}`
                        : "Enter the estimated claim value in USD."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>Attachments</FormLabel>
                <FormDescription>
                  Provide URLs to photos, receipts, or estimates.
                </FormDescription>
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="flex flex-col gap-2 sm:flex-row sm:items-center"
                    >
                      <FormField
                        control={form.control}
                        name={`attachments.${index}`}
                        render={({ field: attachmentField }) => (
                          <FormItem className="w-full">
                            <FormControl>
                              <Input
                                placeholder="https://example.com/attachment"
                                type="url"
                                inputMode="url"
                                autoComplete="off"
                                spellCheck={false}
                                {...attachmentField}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        className="self-start sm:self-center"
                        aria-label="Remove attachment"
                        disabled={fields.length === 1}
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append("")}
                  className="mt-3"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add Another Link
                </Button>
                {attachmentsError ? (
                  <p className="text-sm font-medium text-destructive">
                    {attachmentsError}
                  </p>
                ) : null}
              </FormItem>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="submit"
                  className="shadow-soft"
                  disabled={submitting}
                >
                  {submitting ? "Submitting..." : "Create Claim"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.push("/claims")}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="animate-fade-up-2 motion-reduce:animate-none">
        <CardHeader>
          <CardTitle>Intake Checklist</CardTitle>
          <CardDescription>
            Use this to keep claims complete and audit-ready.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/40 p-4">
            <LinkIcon className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
            <div>
              <p className="font-semibold text-foreground">Evidence Links</p>
              <p>
                Attachments must be accessible URLs. Avoid internal file paths.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/40 p-4">
            <CalendarIcon className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
            <div>
              <p className="font-semibold text-foreground">Incident Timing</p>
              <p>
                Keep incident dates accurate to preserve coverage and timeline.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/40 p-4">
            <PlusCircle className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
            <div>
              <p className="font-semibold text-foreground">Clear Narrative</p>
              <p>
                A concise description helps the AI triage and speeds approvals.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
