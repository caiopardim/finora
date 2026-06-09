import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { UsersModule } from './modules/users/users.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { GoalsModule } from './modules/goals/goals.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { ReportsModule } from './modules/reports/reports.module';
import { BillsModule } from './modules/bills/bills.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { SupabaseModule } from './config/supabase.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    SupabaseModule,
    UsersModule,
    TransactionsModule,
    CategoriesModule,
    GoalsModule,
    BillsModule,
    WhatsappModule,
    ReportsModule,
    AppointmentsModule,
  ],
})
export class AppModule {}
