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

    const event = body?.event;
    if (event !== 'messages.upsert') return { status: 'ignored' };

    const data = body?.data;
    const isFromMe = data?.key?.fromMe;
    if (isFromMe) return { status: 'ignored' };

    const phone = data?.key?.remoteJid?.replace('@s.whatsapp.net', '');
    if (!phone) return { status: 'ignored' };

    // Handle button reply (delete action)
    const buttonReply =
      data?.message?.buttonsResponseMessage?.selectedButtonId ||
      data?.message?.templateButtonReplyMessage?.selectedId ||
      data?.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson;

    if (buttonReply) {
      const buttonId = typeof buttonReply === 'string' ? buttonReply : JSON.stringify(buttonReply);
      this.whatsapp.handleButtonReply(phone, buttonId).catch((err) =>
        this.logger.error('Error handling button reply', err),
      );
      return { status: 'processing' };
    }

    // Handle text message
    const message = data?.message?.conversation || data?.message?.extendedTextMessage?.text;
    if (!message) return { status: 'ignored' };

    this.whatsapp.handleIncomingMessage(phone, message).catch((err) =>
      this.logger.error('Unhandled error in message processing', err),
    );

    return { status: 'processing' };
  }
}
