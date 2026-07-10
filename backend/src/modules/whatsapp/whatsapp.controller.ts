import { Controller, Post, Body, Headers, UnauthorizedException, Logger, HttpCode } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsappService } from './whatsapp.service';
import { AiService } from './ai.service';

@Controller('webhook')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(
    private readonly whatsapp: WhatsappService,
    private readonly config: ConfigService,
    private readonly ai: AiService,
  ) {}

  @Post('welcome')
  @HttpCode(200)
  async sendWelcome(
    @Body() body: { phone: string; name: string },
    @Headers('x-admin-secret') secret: string,
  ): Promise<{ ok: boolean }> {
    const adminSecret = this.config.get('ADMIN_WEBHOOK_SECRET') || this.config.get('WEBHOOK_SECRET');
    if (adminSecret && secret !== adminSecret) throw new UnauthorizedException();

    const phone = body.phone?.replace(/\D/g, '');
    if (!phone) return { ok: false };

    const name = body.name || 'por lá';
    await this.whatsapp.sendMessage(phone,
      `🐷 *Olá, ${name}! Bem-vindo ao Finora!*\n\n` +
      `Sua conta foi ativada e você já pode começar a controlar suas finanças direto aqui pelo WhatsApp.\n\n` +
      `Você pode:\n` +
      `💸 Registrar gastos — _"Gastei R$ 50 no mercado"_\n` +
      `💰 Registrar receitas — _"Recebi R$ 2.000 de salário"_\n` +
      `📊 Ver relatórios — _"Como estão meus gastos?"_\n` +
      `📅 Agendar compromissos — _"Dentista sexta às 10h"_\n\n` +
      `Acesse seu dashboard:\n👉 *https://meufinora.com.br/dashboard*\n\n` +
      `Qualquer dúvida é só me chamar! 😊`,
    );

    return { ok: true };
  }

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

    // Handle button/list reply (delete action)
    const buttonReply =
      data?.message?.buttonsResponseMessage?.selectedButtonId ||
      data?.message?.templateButtonReplyMessage?.selectedId ||
      data?.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
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

    // Handle audio/voice message
    const audioMessage = data?.message?.audioMessage || data?.message?.pttMessage;
    if (!message && audioMessage) {
      this.processAudioMessage(phone, data).catch((err) =>
        this.logger.error('Error handling audio message', err),
      );
      return { status: 'processing' };
    }

    // Handle image (comprovante/receipt photo) — with or without caption
    const imageMessage =
      data?.message?.imageMessage ||
      data?.message?.imageWithCaptionMessage;
    if (imageMessage) {
      // Inject imageMessage into data.message so handleMediaMessage can find it
      if (!data.message.imageMessage) data.message.imageMessage = imageMessage;
      this.whatsapp.handleMediaMessage(phone, data).catch((err) =>
        this.logger.error('Error handling image message', err),
      );
      return { status: 'processing' };
    }

    // Handle document (PDF, XLSX, CSV) — with or without caption
    const documentMessage =
      data?.message?.documentMessage ||
      data?.message?.documentWithCaptionMessage?.message?.documentMessage;
    if (documentMessage) {
      // Inject documentMessage into data.message so handleMediaMessage can find it
      if (!data.message.documentMessage) data.message.documentMessage = documentMessage;
      this.whatsapp.handleMediaMessage(phone, data).catch((err) =>
        this.logger.error('Error handling document message', err),
      );
      return { status: 'processing' };
    }

    if (!message) {
      // Tipos que não sabemos processar (vídeo, sticker, localização, contato...).
      // Só avisamos se for claramente uma mídia enviada pelo usuário — evita
      // responder a eventos silenciosos (status, reações, protocolos internos).
      const knownUnsupported =
        data?.message?.videoMessage ||
        data?.message?.stickerMessage ||
        data?.message?.locationMessage ||
        data?.message?.contactMessage ||
        data?.message?.contactsArrayMessage;
      if (knownUnsupported) {
        this.whatsapp.sendMessage(
          phone,
          '🤔 Não consigo ler esse tipo de mensagem.\n\n' +
          'Você pode me mandar:\n' +
          '💬 *Texto* — "gastei 50 no mercado"\n' +
          '🎙️ *Áudio* — falando o gasto\n' +
          '📷 *Foto* de comprovante ou nota\n' +
          '📄 *PDF* ou *planilha* (CSV/XLSX) de extrato',
        ).catch((err) => this.logger.error('Error sending unsupported-type hint', err));
        return { status: 'processing' };
      }
      return { status: 'ignored' };
    }

    // Handle delete command: "excluir XXXXXX"
    const deleteMatch = message.trim().match(/^excluir\s+([a-f0-9]{6})$/i);
    if (deleteMatch) {
      this.whatsapp.handleDeleteCommand(phone, deleteMatch[1]).catch((err) =>
        this.logger.error('Error handling delete command', err),
      );
      return { status: 'processing' };
    }

    this.whatsapp.handleIncomingMessage(phone, message).catch((err) =>
      this.logger.error('Unhandled error in message processing', err),
    );

    return { status: 'processing' };
  }

  private async processAudioMessage(phone: string, data: any): Promise<void> {
    try {
      // Download audio from Evolution API
      const instanceName = this.config.get('EVOLUTION_INSTANCE', 'finora');
      const evolutionUrl = this.config.get('EVOLUTION_API_URL');
      const evolutionKey = this.config.get('EVOLUTION_API_KEY');
      const messageId = data?.key?.id;

      const audioController = new AbortController();
      const audioTimer = setTimeout(() => audioController.abort(), 45_000);
      let mediaRes: Response;
      try {
        mediaRes = await fetch(
          `${evolutionUrl}/chat/getBase64FromMediaMessage/${instanceName}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', apikey: evolutionKey },
            body: JSON.stringify({ message: { key: data?.key, message: data?.message } }),
            signal: audioController.signal,
          },
        );
      } catch (err) {
        this.logger.error(`Audio download timeout/error: ${(err as Error).message}`);
        await this.whatsapp.sendMessage(phone, '⌛ O áudio demorou demais pra baixar. Tente enviar em texto!');
        return;
      } finally {
        clearTimeout(audioTimer);
      }

      if (!mediaRes.ok) {
        this.logger.error(`Failed to download audio: ${mediaRes.status}`);
        await this.whatsapp.sendMessage(phone, '❌ Não consegui processar seu áudio. Tente enviar em texto!');
        return;
      }

      const mediaData = await mediaRes.json() as any;
      const base64 = mediaData?.base64 || mediaData?.data;
      if (!base64) {
        await this.whatsapp.sendMessage(phone, '❌ Não consegui ler o áudio. Tente enviar em texto!');
        return;
      }

      // Transcribe with Whisper
      const transcription = await this.ai.transcribeAudio(base64);
      if (!transcription) {
        await this.whatsapp.sendMessage(phone, '❌ Não entendi o áudio. Pode repetir em texto?');
        return;
      }

      this.logger.log(`Audio transcribed for ${phone}: "${transcription}"`);

      // Process transcribed text normally
      await this.whatsapp.handleIncomingMessage(phone, transcription);
    } catch (err) {
      this.logger.error('Error processing audio message', err);
      await this.whatsapp.sendMessage(phone, '❌ Erro ao processar áudio. Tente enviar em texto!');
    }
  }
}
