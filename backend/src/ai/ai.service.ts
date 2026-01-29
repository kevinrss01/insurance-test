import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { generateText, NoObjectGeneratedError, Output } from 'ai';
import {
  claimAiResponseSchema,
  ClaimAiResponse,
} from '../claims/claims.schemas';
import { AppException } from '../common/errors/app-exception';

const MODEL_ID = 'google/gemini-3-flash';
const PROMPT_VERSION = 'v1';
const THINKING_BUDGET = 512; // Low reasoning cap per requirements.

export interface ClaimAiInput {
  id: string;
  policyNumber: string;
  claimType: string;
  incidentDate: string;
  location: string;
  description: string;
  estimatedAmount: number;
  attachments: string[];
}

export interface ClaimAiResult {
  response: ClaimAiResponse;
  model: string;
  promptVersion: string;
  latencyMs: number;
  tokenUsage: { prompt?: number; completion?: number; total?: number } | null;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  async generateClaimInsights(input: ClaimAiInput): Promise<ClaimAiResult> {
    this.logger.log(
      `generateClaimInsights start claimId=${input.id} type=${input.claimType} amount=${input.estimatedAmount} attachments=${input.attachments.length}`,
    );
    const prompt = buildPrompt(input);

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const startedAt = Date.now();
      try {
        this.logger.debug(
          `AI request attempt=${attempt} model=${MODEL_ID} promptVersion=${PROMPT_VERSION}`,
        );
        const result = await generateText({
          model: MODEL_ID,
          output: Output.object({
            schema: claimAiResponseSchema,
            name: 'ClaimTriage',
            description:
              'Insurance claim summary, triage decision, missing info questions, and confidence score.',
          }),
          prompt,
          providerOptions: {
            google: {
              thinkingConfig: {
                thinkingBudget: THINKING_BUDGET,
              },
            },
          },
        });

        const response = claimAiResponseSchema.parse(result.output);
        const latencyMs = Date.now() - startedAt;
        const usage = normalizeUsage(result.usage);

        this.logger.log(
          `AI response ok claimId=${input.id} latencyMs=${latencyMs} triage=${response.triage}`,
        );
        if (usage) {
          this.logger.debug(
            `AI token usage claimId=${input.id} prompt=${usage.prompt ?? 'n/a'} completion=${usage.completion ?? 'n/a'} total=${usage.total ?? 'n/a'}`,
          );
        }
        return {
          response,
          model: MODEL_ID,
          promptVersion: PROMPT_VERSION,
          latencyMs,
          tokenUsage: usage,
        };
      } catch (error) {
        if (NoObjectGeneratedError.isInstance(error)) {
          if (attempt === 1) {
            this.logger.warn(
              `AI output failed schema validation claimId=${input.id}. Retrying once.`,
            );
            continue;
          }
          throw new AppException({
            code: 'AI_ERROR',
            message: 'AI response did not match the required schema.',
            status: HttpStatus.BAD_GATEWAY,
            details: { reason: 'SCHEMA_VALIDATION_FAILED' },
          });
        }
        this.logger.error(
          `AI provider error claimId=${input.id} attempt=${attempt}`,
          error instanceof Error ? error.stack : undefined,
        );
        throw new AppException({
          code: 'AI_ERROR',
          message: 'AI generation failed.',
          status: HttpStatus.BAD_GATEWAY,
          details: { reason: 'PROVIDER_ERROR' },
        });
      }
    }

    throw new AppException({
      code: 'AI_ERROR',
      message: 'AI generation failed.',
      status: HttpStatus.BAD_GATEWAY,
    });
  }
}

function buildPrompt(input: ClaimAiInput): string {
  const attachmentsText = input.attachments.length
    ? input.attachments.map((url) => `- ${url}`).join('\n')
    : 'None';

  return `You are an insurance claims triage assistant.
Return ONLY a valid JSON object that matches this schema exactly:
{
  "summary_bullets": [string],
  "triage": "FAST_TRACK" | "ADJUSTER_REVIEW" | "FRAUD_REVIEW",
  "rationale_bullets": [string],
  "missing_info_questions": [string],
  "confidence": number (0 to 1)
}
Rules:
- Do not include markdown or extra keys.
- Arrays must contain concise strings.
- If information is missing, list questions under "missing_info_questions".
- Confidence must be between 0 and 1.

Claim:
- Policy Number: ${input.policyNumber}
- Claim Type: ${input.claimType}
- Incident Date: ${input.incidentDate}
- Location: ${input.location}
- Description: ${input.description}
- Estimated Amount (USD): ${input.estimatedAmount}
- Attachments:\n${attachmentsText}`;
}

function normalizeUsage(usage: {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}): { prompt?: number; completion?: number; total?: number } | null {
  const prompt = usage?.inputTokens ?? undefined;
  const completion = usage?.outputTokens ?? undefined;
  const total = usage?.totalTokens ?? undefined;

  if (prompt === undefined && completion === undefined && total === undefined) {
    return null;
  }

  return {
    prompt,
    completion,
    total,
  };
}
