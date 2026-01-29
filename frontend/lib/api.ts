import type {
  ApiAdapter,
  Claim,
  ClaimAiHistoryResponse,
  ClaimAiVersion,
  CreateClaimPayload,
  GetClaimResponse,
  ListClaimsParams,
  ListClaimsResponse,
} from "./types";
import { mockApi } from "./mockApi";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
const API_MODE = process.env.NEXT_PUBLIC_API_MODE ?? "mock";

const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const error = (await response.json()) as {
        error?: { message?: string };
      };
      message = error?.error?.message ?? message;
    } catch {
      // Ignore JSON parsing errors.
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
};

const liveApi: ApiAdapter = {
  async createClaim(payload: CreateClaimPayload): Promise<Claim> {
    return request<Claim>("/claims", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async listClaims(params: ListClaimsParams = {}): Promise<ListClaimsResponse> {
    const search = new URLSearchParams();
    if (params.type) search.set("type", params.type);
    if (params.status) search.set("status", params.status);
    if (params.q) search.set("q", params.q);
    if (params.limit) search.set("limit", String(params.limit));
    if (params.cursor) search.set("cursor", params.cursor);

    const query = search.toString();
    return request<ListClaimsResponse>(`/claims${query ? `?${query}` : ""}`);
  },

  async getClaim(id: string): Promise<GetClaimResponse> {
    return request<GetClaimResponse>(`/claims/${id}`);
  },

  async generateAi(id: string): Promise<ClaimAiVersion> {
    return request<ClaimAiVersion>(`/claims/${id}/ai:generate`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  async getClaimAi(id: string): Promise<ClaimAiHistoryResponse> {
    return request<ClaimAiHistoryResponse>(`/claims/${id}/ai`);
  },
};

export const api: ApiAdapter = API_MODE === "live" ? liveApi : mockApi;
