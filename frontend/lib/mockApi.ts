import type {
  ApiAdapter,
  Claim,
  ClaimAiHistoryResponse,
  ClaimAiResponse,
  ClaimAiVersion,
  ClaimSummary,
  CreateClaimPayload,
  ListClaimsParams,
  ListClaimsResponse,
} from "./types";
import { mockAiVersions, mockClaims } from "./mockData";

const claims: Claim[] = [...mockClaims];
const aiVersions: ClaimAiVersion[] = [...mockAiVersions];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const toSummary = (claim: Claim): ClaimSummary => ({
  id: claim.id,
  policyNumber: claim.policyNumber,
  claimType: claim.claimType,
  incidentDate: claim.incidentDate,
  estimatedAmount: claim.estimatedAmount,
  status: claim.status,
  createdAt: claim.createdAt,
});

const getLatestAi = (claimId: string) => {
  const versions = aiVersions
    .filter((version) => version.claimId === claimId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  return versions[0] ?? null;
};

const generateAiResponse = (claim: Claim): ClaimAiResponse => {
  const commonQuestions = {
    auto: [
      "Was a police report filed?",
      "Any injuries reported at the scene?",
      "Do we have a repair estimate or shop contact?",
    ],
    home: [
      "Is the property habitable?",
      "Has mitigation begun (dry-out, cleanup)?",
      "Do we have contractor estimates?",
    ],
    travel: [
      "Provide airline delay confirmation.",
      "Confirm total receipts submitted.",
      "Any prior baggage issues for this trip?",
    ],
  };

  return {
    summary_bullets: [
      `${claim.claimType.toUpperCase()} claim reported in ${claim.location}.`,
      `Incident date: ${claim.incidentDate} with estimated impact of $${claim.estimatedAmount.toFixed(
        2
      )}.`,
    ],
    triage: claim.estimatedAmount > 5000 ? "ADJUSTER_REVIEW" : "FAST_TRACK",
    rationale_bullets: [
      claim.estimatedAmount > 5000
        ? "Higher loss estimate warrants adjuster review."
        : "Loss estimate within fast-track threshold.",
      claim.attachments.length
        ? "Supporting attachments provided."
        : "Awaiting supporting documentation.",
    ],
    missing_info_questions: commonQuestions[claim.claimType],
    confidence: claim.estimatedAmount > 5000 ? 0.72 : 0.84,
  };
};

const createId = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 8)}`;

export const mockApi: ApiAdapter = {
  async createClaim(payload: CreateClaimPayload) {
    await wait(450);
    const now = new Date().toISOString();
    const claim: Claim = {
      id: createId("clm"),
      status: "NEW",
      createdAt: now,
      updatedAt: now,
      ...payload,
    };
    claims.unshift(claim);
    return claim;
  },

  async listClaims(params: ListClaimsParams = {}) {
    await wait(350);
    const { type, status, q, limit = 20, cursor } = params;

    const sorted = [...claims].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const filtered = sorted.filter((claim) => {
      if (type && claim.claimType !== type) return false;
      if (status && claim.status !== status) return false;
      if (q) {
        const term = q.toLowerCase();
        if (
          !claim.policyNumber.toLowerCase().includes(term) &&
          !claim.location.toLowerCase().includes(term)
        ) {
          return false;
        }
      }
      return true;
    });

    let startIndex = 0;
    if (cursor) {
      const cursorIndex = filtered.findIndex((claim) => claim.id === cursor);
      if (cursorIndex >= 0) startIndex = cursorIndex + 1;
    }

    const page = filtered.slice(startIndex, startIndex + limit);
    const nextCursor =
      startIndex + limit < filtered.length
        ? page[page.length - 1]?.id ?? null
        : null;

    const response: ListClaimsResponse = {
      items: page.map(toSummary),
      nextCursor,
    };

    return response;
  },

  async getClaim(id: string) {
    await wait(300);
    const claim = claims.find((item) => item.id === id);
    if (!claim) {
      throw new Error("Claim not found");
    }

    return {
      claim,
      latestAi: getLatestAi(id),
    };
  },

  async generateAi(id: string) {
    await wait(800);
    const claim = claims.find((item) => item.id === id);
    if (!claim) {
      throw new Error("Claim not found");
    }

    const version: ClaimAiVersion = {
      id: createId("aiv"),
      claimId: claim.id,
      createdAt: new Date().toISOString(),
      model: "gemini-3-flash",
      promptVersion: "v1",
      response: generateAiResponse(claim),
      latencyMs: Math.floor(900 + Math.random() * 700),
      tokenUsage: {
        prompt: 420,
        completion: 250,
        total: 670,
      },
    };

    aiVersions.unshift(version);
    return version;
  },

  async getClaimAi(id: string): Promise<ClaimAiHistoryResponse> {
    await wait(300);
    const history = aiVersions
      .filter((version) => version.claimId === id)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    return {
      latest: history[0] ?? null,
      history,
    };
  },
};
