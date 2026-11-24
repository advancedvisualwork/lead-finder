import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LeadsModule } from './leads/leads.module';

const ONE_MINUTE_MS = 60_000;

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: ONE_MINUTE_MS, limit: 30 }]), LeadsModule],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
