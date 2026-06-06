import { Controller, Get, Query, Headers, Inject, UnauthorizedException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../config/supabase.module';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly service: ReportsService,
    @Inject(SUPABASE_CLIENT) private supabase: SupabaseClient,
  ) {}

  private async getUserId(token: string) {
    if (!token) throw new UnauthorizedException();
    const { data, error } = await this.supabase.auth.getUser(token.replace('Bearer ', ''));
    if (error || !data.user) throw new UnauthorizedException();
    return data.user.id;
  }

  @Get('summary')
  async getSummary(@Headers('authorization') auth: string) {
    return this.service.getReportData(await this.getUserId(auth));
  }

  @Get('history')
  async getHistory(
    @Headers('authorization') auth: string,
    @Query('months') months: number,
  ) {
    return this.service.getMonthlyHistory(await this.getUserId(auth), months || 6);
  }
}
