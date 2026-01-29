import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Claim, ClaimAiVersion, Prisma } from '@prisma/client';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { centsToDollars, dollarsToCents } from '../common/utils/money';
import { CreateClaimInput, ListClaimsQuery } from './claims.schemas';

@Injectable()
export class ClaimsService {
  private readonly logger = new Logger(ClaimsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async createClaim(input: CreateClaimInput) {
    this.logger.log(
      `createClaim start type=${input.claimType} amount=${input.estimatedAmount} attachments=${input.attachments?.length ?? 0}`,
    );
    const created = await this.prisma.claim.create({
      data: {
        policyNumber: input.policyNumber,
        claimType: input.claimType,
        incidentDate: input.incidentDate,
        location: input.location,
        description: input.description,
        estimatedAmount: dollarsToCents(input.estimatedAmount),
        status: 'NEW',
        attachments: JSON.stringify(input.attachments),
      },
    });

    this.logger.log(`createClaim created id=${created.id} status=${created.status}`);
    return toClaimDto(created);
  }

  async listClaims(query: ListClaimsQuery) {
    const limit = Math.min(query.limit ?? 20, 100);
    const filters: Prisma.ClaimWhereInput[] = [];

    if (query.type) {
      filters.push({ claimType: query.type });
    }

    if (query.status) {
      filters.push({ status: query.status });
    }

    if (query.q) {
      filters.push({
        OR: [
          { policyNumber: { contains: query.q } },
          { location: { contains: query.q } },
        ],
      });
    }

    const where: Prisma.ClaimWhereInput = filters.length
      ? {
          AND: filters,
        }
      : {};

    if (query.cursor) {
      const cursorRecord = await this.prisma.claim.findUnique({
        where: { id: query.cursor },
        select: { id: true, createdAt: true },
      });

      if (!cursorRecord) {
        throw new BadRequestException({
          message: 'Invalid cursor',
          details: { cursor: query.cursor },
        });
      }

      const cursorFilter: Prisma.ClaimWhereInput = {
        OR: [
          { createdAt: { lt: cursorRecord.createdAt } },
          { createdAt: cursorRecord.createdAt, id: { lt: cursorRecord.id } },
        ],
      };

      const existingAnd = Array.isArray(where.AND)
        ? where.AND
        : where.AND
        ? [where.AND]
        : [];

      where.AND = [...existingAnd, cursorFilter];
    }

    this.logger.log(
      `listClaims start limit=${limit} filters=${filters.length} cursor=${query.cursor ?? 'none'}`,
    );
    const claims = await this.prisma.claim.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const hasNext = claims.length > limit;
    const items = hasNext ? claims.slice(0, -1) : claims;
    const nextCursor = hasNext ? items[items.length - 1]?.id ?? null : null;

    this.logger.log(
      `listClaims done count=${items.length} hasNext=${hasNext} nextCursor=${nextCursor ?? 'none'}`,
    );
    return {
      items: items.map(toClaimSummaryDto),
      nextCursor,
    };
  }

  async getClaim(id: string) {
    this.logger.log(`getClaim start id=${id}`);
    const claim = await this.prisma.claim.findUnique({
      where: { id },
    });

    if (!claim) {
      this.logger.warn(`getClaim not found id=${id}`);
      throw new NotFoundException({ message: 'Claim not found' });
    }

    const latestAi = await this.prisma.claimAiVersion.findFirst({
      where: { claimId: claim.id },
      orderBy: { createdAt: 'desc' },
    });

    this.logger.log(
      `getClaim done id=${id} latestAi=${latestAi ? latestAi.id : 'none'}`,
    );
    return {
      claim: toClaimDto(claim),
      latestAi: latestAi ? toClaimAiDto(latestAi) : null,
    };
  }

  async generateAiVersion(id: string) {
    this.logger.log(`generateAiVersion start id=${id}`);
    const claim = await this.prisma.claim.findUnique({
      where: { id },
    });

    if (!claim) {
      this.logger.warn(`generateAiVersion not found id=${id}`);
      throw new NotFoundException({ message: 'Claim not found' });
    }

    this.logger.log(
      `generateAiVersion call ai claimId=${claim.id} type=${claim.claimType} amount=${centsToDollars(claim.estimatedAmount)} attachments=${normalizeAttachments(claim.attachments).length}`,
    );
    const aiResult = await this.aiService.generateClaimInsights({
      id: claim.id,
      policyNumber: claim.policyNumber,
      claimType: claim.claimType,
      incidentDate: claim.incidentDate,
      location: claim.location,
      description: claim.description,
      estimatedAmount: centsToDollars(claim.estimatedAmount),
      attachments: normalizeAttachments(claim.attachments),
    });

    this.logger.log(
      `generateAiVersion ai done claimId=${claim.id} latencyMs=${aiResult.latencyMs} triage=${aiResult.response.triage}`,
    );
    const created = await this.prisma.claimAiVersion.create({
      data: {
        claimId: claim.id,
        model: aiResult.model,
        promptVersion: aiResult.promptVersion,
        responseJson: JSON.stringify(aiResult.response),
        latencyMs: aiResult.latencyMs,
        tokenUsage: aiResult.tokenUsage
          ? JSON.stringify(aiResult.tokenUsage)
          : undefined,
      },
    });

    this.logger.log(
      `generateAiVersion saved aiVersionId=${created.id} claimId=${claim.id}`,
    );
    return toClaimAiDto(created);
  }

  async getAiHistory(id: string) {
    this.logger.log(`getAiHistory start claimId=${id}`);
    const exists = await this.prisma.claim.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!exists) {
      this.logger.warn(`getAiHistory not found claimId=${id}`);
      throw new NotFoundException({ message: 'Claim not found' });
    }

    const history = await this.prisma.claimAiVersion.findMany({
      where: { claimId: id },
      orderBy: { createdAt: 'desc' },
    });

    this.logger.log(
      `getAiHistory done claimId=${id} versions=${history.length}`,
    );
    return {
      latest: history[0] ? toClaimAiDto(history[0]) : null,
      history: history.map(toClaimAiDto),
    };
  }
}

function toClaimDto(claim: Claim) {
  return {
    id: claim.id,
    policyNumber: claim.policyNumber,
    claimType: claim.claimType,
    incidentDate: claim.incidentDate,
    location: claim.location,
    description: claim.description,
    estimatedAmount: centsToDollars(claim.estimatedAmount),
    status: claim.status,
    attachments: normalizeAttachments(claim.attachments),
    createdAt: claim.createdAt.toISOString(),
    updatedAt: claim.updatedAt.toISOString(),
  };
}

function toClaimSummaryDto(claim: Claim) {
  return {
    id: claim.id,
    policyNumber: claim.policyNumber,
    claimType: claim.claimType,
    incidentDate: claim.incidentDate,
    estimatedAmount: centsToDollars(claim.estimatedAmount),
    status: claim.status,
    createdAt: claim.createdAt.toISOString(),
  };
}

function toClaimAiDto(aiVersion: ClaimAiVersion) {
  return {
    id: aiVersion.id,
    claimId: aiVersion.claimId,
    createdAt: aiVersion.createdAt.toISOString(),
    model: aiVersion.model,
    promptVersion: aiVersion.promptVersion,
    response: safeJsonParse(aiVersion.responseJson),
    latencyMs: aiVersion.latencyMs,
    tokenUsage: aiVersion.tokenUsage
      ? safeJsonParse(aiVersion.tokenUsage)
      : null,
  };
}

function normalizeAttachments(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  const parsed = safeJsonParse(value);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((item): item is string => typeof item === 'string');
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
