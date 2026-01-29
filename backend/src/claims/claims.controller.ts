import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createClaimSchema,
  listClaimsQuerySchema,
  CreateClaimInput,
  ListClaimsQuery,
} from './claims.schemas';
import { ClaimsService } from './claims.service';

@Controller('claims')
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createClaim(
    @Body(new ZodValidationPipe(createClaimSchema)) body: CreateClaimInput,
  ) {
    return this.claimsService.createClaim(body);
  }

  @Get()
  listClaims(
    @Query(new ZodValidationPipe(listClaimsQuerySchema)) query: ListClaimsQuery,
  ) {
    return this.claimsService.listClaims(query);
  }

  @Get(':id')
  getClaim(@Param('id') id: string) {
    return this.claimsService.getClaim(id);
  }

  @Post(':id/ai:generate')
  @HttpCode(HttpStatus.CREATED)
  generateAi(@Param('id') id: string) {
    return this.claimsService.generateAiVersion(id);
  }

  @Get(':id/ai')
  getAiHistory(@Param('id') id: string) {
    return this.claimsService.getAiHistory(id);
  }
}
