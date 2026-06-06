import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, Headers, UnauthorizedException,
} from '@nestjs/common';
import { TransactionsService, CreateTransactionDto, TransactionFilter } from './transactions.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../config/supabase.module';

@ApiTags('transactions')
@ApiBearerAuth()
@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly service: TransactionsService,
    @Inject(SUPABASE_CLIENT) private supabase: SupabaseClient,
  ) {}

  private async getUserId(token: string): Promise<string> {
    if (!token) throw new UnauthorizedException();
    const jwt = token.replace('Bearer ', '');
    const { data, error } = await this.supabase.auth.getUser(jwt);
    if (error || !data.user) throw new UnauthorizedException();
    return data.user.id;
  }

  @Get()
  async findAll(
    @Headers('authorization') auth: string,
    @Query() filter: TransactionFilter,
  ) {
    const userId = await this.getUserId(auth);
    return this.service.findAll(userId, filter);
  }

  @Get('summary')
  async getSummary(
    @Headers('authorization') auth: string,
    @Query('month') month: string,
  ) {
    const userId = await this.getUserId(auth);
    return this.service.getSummary(userId, month);
  }

  @Get(':id')
  async findOne(@Headers('authorization') auth: string, @Param('id') id: string) {
    const userId = await this.getUserId(auth);
    return this.service.findOne(userId, id);
  }

  @Post()
  async create(@Headers('authorization') auth: string, @Body() dto: CreateTransactionDto) {
    const userId = await this.getUserId(auth);
    return this.service.create(userId, dto);
  }

  @Put(':id')
  async update(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateTransactionDto>,
  ) {
    const userId = await this.getUserId(auth);
    return this.service.update(userId, id, dto);
  }

  @Delete(':id')
  async remove(@Headers('authorization') auth: string, @Param('id') id: string) {
    const userId = await this.getUserId(auth);
    return this.service.remove(userId, id);
  }
}
