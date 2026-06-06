import {
  Controller, Get, Post, Delete, Patch,
  Body, Param, Query, Headers, Inject, UnauthorizedException,
} from '@nestjs/common';
import { BillsService } from './bills.service';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../config/supabase.module';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('bills')
@ApiBearerAuth()
@Controller('bills')
export class BillsController {
  constructor(
    private readonly service: BillsService,
    @Inject(SUPABASE_CLIENT) private supabase: SupabaseClient,
  ) {}

  private async getUserId(token: string) {
    if (!token) throw new UnauthorizedException();
    const { data, error } = await this.supabase.auth.getUser(token.replace('Bearer ', ''));
    if (error || !data.user) throw new UnauthorizedException();
    return data.user.id;
  }

  @Get()
  async findAll(
    @Headers('authorization') auth: string,
    @Query('paid') paid: string,
    @Query('upcoming') upcoming: string,
  ) {
    const userId = await this.getUserId(auth);
    return this.service.findAll(userId, {
      paid: paid !== undefined ? paid === 'true' : undefined,
      upcoming: upcoming === 'true',
    });
  }

  @Post()
  async create(@Headers('authorization') auth: string, @Body() dto: any) {
    return this.service.create(await this.getUserId(auth), dto);
  }

  @Patch(':id/pay')
  async markPaid(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.service.markPaid(await this.getUserId(auth), id);
  }

  @Delete(':id')
  async remove(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.service.remove(await this.getUserId(auth), id);
  }
}
