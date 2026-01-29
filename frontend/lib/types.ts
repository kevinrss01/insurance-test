export type ClaimType = "auto" | "home" | "travel";
export type ClaimStatus = "NEW" | "IN_REVIEW" | "RESOLVED";

export type Claim = {
  id: string;
  policyNumber: string;
  claimType: ClaimType;
  incidentDate: string;
  location: string;
  description: string;
  estimatedAmount: number;
  status: ClaimStatus;
  attachments: string[];
  createdAt: string;
  updatedAt: string;
};

export type ClaimSummary = {
  id: string;
  policyNumber: string;
  claimType: ClaimType;
  incidentDate: string;
  estimatedAmount: number;
  status: ClaimStatus;
  createdAt: string;
};

export type ClaimAiResponse = {
  summary_bullets: string[];
  triage: "FAST_TRACK" | "ADJUSTER_REVIEW" | "FRAUD_REVIEW";
  rationale_bullets: string[];
  missing_info_questions: string[];
  confidence: number;
};

export type ClaimAiVersion = {
  id: string;
  claimId: string;
  createdAt: string;
  model: string;
  promptVersion: string;
  response: ClaimAiResponse;
  latencyMs: number;
  tokenUsage?: { prompt: number; completion: number; total: number };
};

export type ClaimAiHistoryResponse = {
  latest: ClaimAiVersion | null;
  history: ClaimAiVersion[];
};

export type CreateClaimPayload = {
  policyNumber: string;
  claimType: ClaimType;
  incidentDate: string;
  location: string;
  description: string;
  estimatedAmount: number;
  attachments: string[];
};

export type ListClaimsParams = {
  type?: ClaimType;
  status?: ClaimStatus;
  q?: string;
  limit?: number;
  cursor?: string;
};

export type ListClaimsResponse = {
  items: ClaimSummary[];
  nextCursor: string | null;
};

export type GetClaimResponse = {
  claim: Claim;
  latestAi: ClaimAiVersion | null;
};

export type ErrorResponse = {
  error: {
    code:
      | "VALIDATION_ERROR"
      | "NOT_FOUND"
      | "AI_ERROR"
      | "INTERNAL_ERROR";
    message: string;
    details?: Record<string, unknown> | null;
  };
};

export type ApiAdapter = {
  createClaim: (payload: CreateClaimPayload) => Promise<Claim>;
  listClaims: (params?: ListClaimsParams) => Promise<ListClaimsResponse>;
  getClaim: (id: string) => Promise<GetClaimResponse>;
  generateAi: (id: string) => Promise<ClaimAiVersion>;
  getClaimAi: (id: string) => Promise<ClaimAiHistoryResponse>;
};
