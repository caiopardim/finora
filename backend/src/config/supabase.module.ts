import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Polyfill WebSocket for Node.js < 22
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ws = require('ws');
if (!globalThis.WebSocket) {
  (globalThis as any).WebSocket = ws;
}

export const SUPABASE_CLIENT = 'SUPABASE_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: SUPABASE_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): SupabaseClient => {
        return createClient(
          config.get<string>('SUPABASE_URL'),
          config.get<string>('SUPABASE_SERVICE_KEY'),
          { realtime: { transport: ws } }
        );
      },
    },
  ],
  exports: [SUPABASE_CLIENT],
})
export class SupabaseModule {}
