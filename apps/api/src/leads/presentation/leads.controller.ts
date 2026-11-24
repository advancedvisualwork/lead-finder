import { Controller, Get, Header, Inject, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { buildCsvFileName, serializeLeadsToCsv } from '../application/lead-csv.serializer';
import { SearchLeadsService } from '../application/search-leads.service';
import type { LeadSearchResult } from '../domain/lead';
import { NICHES } from '../domain/niche-catalog';
import {
  exportLeadsQuerySchema,
  searchLeadsQuerySchema,
  type ExportLeadsQuery,
  type SearchLeadsQuery,
} from './search-leads.query';

@Controller()
export class LeadsController {
  constructor(@Inject(SearchLeadsService) private readonly searchLeads: SearchLeadsService) {}

  @Get('niches')
  listNiches(): { id: string; label: string }[] {
    return NICHES.map(({ id, label }) => ({ id, label }));
  }

  @Get('leads')
  search(@Query(new ZodValidationPipe(searchLeadsQuerySchema)) query: SearchLeadsQuery): Promise<LeadSearchResult> {
    return this.searchLeads.execute(query);
  }

  @Get('leads/export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  async exportCsv(
    @Query(new ZodValidationPipe(exportLeadsQuerySchema)) query: ExportLeadsQuery,
    @Res({ passthrough: true }) response: Response,
  ): Promise<string> {
    const leads = await this.searchLeads.executeForCities(query);
    response.setHeader('Content-Disposition', `attachment; filename="${buildCsvFileName(query.city, query.niche)}"`);
    return serializeLeadsToCsv(leads);
  }
}
