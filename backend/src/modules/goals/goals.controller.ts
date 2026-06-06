import { Controller, Get, Post, Delete, Body, Param, Headers, Inject, UnauthorizedException, Patch } from '@nestjs/common';
import { GoalsService } from './goals.service';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../config/supabase.module';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('goals')
@ApiBearerAuth()
@Controller('goals')
export class GoalsController {
  constructor(
    private readonly service: GoalsService,
    @Inject(SUPABASE_CLIENT) private supabase: SupabaseClient,
  ) {}

  private async getUserId(token: string) {
    if (!token) throw new UnauthorizedException();
    const { data, error } = await this.supabase.auth.getUser(token.replace('Bearer ', ''));
    if (error || !data.user) throw new UnauthorizedException();
    return data.user.id;
  }

  @Get()
  async findAll(@Headers('authorization') auth: string) {
    return this.service.findAll(await this.getUserId(auth));
  }

  @Post()
  async create(@Headers('authorization') auth: string, @Body() dto: any) {
    return this.service.create(await this.getUserId(auth), dto);
  }

  @Patch(':id/progress')
  async addProgress(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body('amount') amount: number,
  ) {
    return this.service.addProgress(await this.getUserId(auth), id, amount);
  }

  @Delete(':id')
  async remove(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.service.remove(await this.getUserId(auth), id);
  }
}
