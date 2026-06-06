import { Controller, Post, Body, Headers, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsappService } from './whatsapp.service';

@Controller('webhook')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(
    private readonly whatsapp: WhatsappService,
    private readonly config: ConfigService,
  ) {}

  @Post('whatsapp')
  async handleWebhook(
    @Body() body: any,
    @Headers('apikey') apiKey: string,
  ): Promise<{ status: string }> {
    const secret = this.config.get('WEBHOOK_SECRET');
    if (secret && apiKey !== secret) {
      throw new UnauthorizedException('Invalid webhook secret');
    }

    this.logger.debug('Webhook received', JSON.stringify(body));

    // Evolution API payload structure
    const event = body?.event;
    if (event !== 'messages.upsert') return { status: 'ignored' };

    const data = body?.data;
    const message = data?.message?.conversation || data?.message?.extendedTextMessage?.text;
    const phone = data?.key?.remoteJid?.replace('@s.whatsapp.net', '');
    const isFromMe = data?.key?.fromMe;

    if (!message || !phone || isFromMe) return { status: 'ignored' };

    // Process async — respond to webhook immediately
    this.whatsapp.handleIncomingMessage(phone, message).catch((err) =>
      this.logger.error('Unhandled error in message processing', err),
    );

    return { status: 'processing' };
  }
}
