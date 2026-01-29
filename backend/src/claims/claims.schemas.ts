import { z } from 'zod';
import { sanitizeString } from '../common/utils/sanitize';

const claimTypeSchema = z.enum(['auto', 'home', 'travel']);
const claimStatusSchema = z.enum(['NEW', 'IN_REVIEW', 'RESOLVED']);

const sanitizedString = z
  .string()
  .transform((value) => sanitizeString(value))
  .refine((value) => value.length > 0, { message: 'Required' });

const isoDateSchema = z
  .string()
  .transform((value) => sanitizeString(value))
  .refine((value) => isValidIsoDate(value), {
    message: 'Invalid date format (expected YYYY-MM-DD)',
  });

const urlSchema = z
  .string()
  .transform((value) => sanitizeString(value))
  .refine((value) => isHttpUrl(value), { message: 'Invalid URL' });

const optionalQueryString = z
  .string()
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    const cleaned = sanitizeString(value);
    return cleaned.length > 0 ? cleaned : undefined;
  });

export const createClaimSchema = z.object({
  policyNumber: sanitizedString,
  claimType: claimTypeSchema,
  incidentDate: isoDateSchema,
  location: sanitizedString,
  description: sanitizedString,
  estimatedAmount: z.number().finite().nonnegative(),
  attachments: z.array(urlSchema),
});

export const listClaimsQuerySchema = z.object({
  type: claimTypeSchema.optional(),
  status: claimStatusSchema.optional(),
  q: optionalQueryString,
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export const claimAiResponseSchema = z.object({
  summary_bullets: z.array(z.string()),
  triage: z.enum(['FAST_TRACK', 'ADJUSTER_REVIEW', 'FRAUD_REVIEW']),
  rationale_bullets: z.array(z.string()),
  missing_info_questions: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export type CreateClaimInput = z.infer<typeof createClaimSchema>;
export type ListClaimsQuery = z.infer<typeof listClaimsQuerySchema>;
export type ClaimAiResponse = z.infer<typeof claimAiResponseSchema>;

export const claimTypeValues = claimTypeSchema.options;
export const claimStatusValues = claimStatusSchema.options;

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime());
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
