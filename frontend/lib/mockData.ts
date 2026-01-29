import type { Claim, ClaimAiVersion } from "./types";

export const mockClaims: Claim[] = [
  {
    id: "clm_7x1h2",
    policyNumber: "PN-24890",
    claimType: "auto",
    incidentDate: "2026-01-18",
    location: "Austin, TX",
    description:
      "Rear-ended at a stop light on Lamar Blvd. Minor bumper damage and whiplash symptoms reported.",
    estimatedAmount: 1850.75,
    status: "IN_REVIEW",
    attachments: ["https://example.com/claims/auto/24890/photo-1.jpg"],
    createdAt: "2026-01-20T14:18:00.000Z",
    updatedAt: "2026-01-24T09:40:00.000Z",
  },
  {
    id: "clm_4t9k3",
    policyNumber: "PN-93210",
    claimType: "home",
    incidentDate: "2026-01-05",
    location: "Madison, WI",
    description:
      "Pipe burst in the kitchen during a freeze, causing water damage to cabinets and flooring.",
    estimatedAmount: 7425,
    status: "NEW",
    attachments: [
      "https://example.com/claims/home/93210/photo-1.jpg",
      "https://example.com/claims/home/93210/estimate.pdf",
    ],
    createdAt: "2026-01-06T10:12:00.000Z",
    updatedAt: "2026-01-06T10:12:00.000Z",
  },
  {
    id: "clm_9p4m7",
    policyNumber: "PN-77342",
    claimType: "travel",
    incidentDate: "2025-12-22",
    location: "Seattle, WA",
    description:
      "Luggage delayed for 3 days on return from JFK. Replacement essentials purchased.",
    estimatedAmount: 410.3,
    status: "RESOLVED",
    attachments: ["https://example.com/claims/travel/77342/receipts.pdf"],
    createdAt: "2025-12-23T17:05:00.000Z",
    updatedAt: "2026-01-02T08:15:00.000Z",
  },
  {
    id: "clm_1z5q8",
    policyNumber: "PN-55120",
    claimType: "auto",
    incidentDate: "2026-01-25",
    location: "San Diego, CA",
    description:
      "Windshield cracked from road debris on I-5. No injuries reported.",
    estimatedAmount: 620.5,
    status: "NEW",
    attachments: ["https://example.com/claims/auto/55120/windshield.jpg"],
    createdAt: "2026-01-26T11:45:00.000Z",
    updatedAt: "2026-01-26T11:45:00.000Z",
  },
];

export const mockAiVersions: ClaimAiVersion[] = [
  {
    id: "aiv_901",
    claimId: "clm_7x1h2",
    createdAt: "2026-01-24T09:45:00.000Z",
    model: "gemini-3-flash",
    promptVersion: "v1",
    response: {
      summary_bullets: [
        "Rear-end collision at stop light with minor bumper damage.",
        "Claimant reports whiplash symptoms; medical review needed.",
      ],
      triage: "ADJUSTER_REVIEW",
      rationale_bullets: [
        "Potential bodily injury increases complexity.",
        "Vehicle damage appears moderate but needs estimate verification.",
      ],
      missing_info_questions: [
        "Was a police report filed?",
        "Any prior neck injuries on record?",
        "Do we have a repair shop estimate?",
      ],
      confidence: 0.78,
    },
    latencyMs: 1540,
    tokenUsage: { prompt: 422, completion: 238, total: 660 },
  },
  {
    id: "aiv_311",
    claimId: "clm_9p4m7",
    createdAt: "2025-12-24T12:30:00.000Z",
    model: "gemini-3-flash",
    promptVersion: "v1",
    response: {
      summary_bullets: [
        "Delayed baggage for 3 days on return travel.",
        "Reimbursement requested for essentials purchased.",
      ],
      triage: "FAST_TRACK",
      rationale_bullets: [
        "Low dollar amount with clear receipts.",
        "No injury or complex liability involved.",
      ],
      missing_info_questions: [
        "Provide airline delay confirmation.",
        "Confirm total amount of receipts submitted.",
      ],
      confidence: 0.86,
    },
    latencyMs: 980,
    tokenUsage: { prompt: 318, completion: 190, total: 508 },
  },
];
