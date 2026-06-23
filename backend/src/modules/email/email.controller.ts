import { Controller, Post, Body, Logger } from '@nestjs/common';
import { EmailService } from './email.service';

@Controller('email')
export class EmailController {
  private readonly logger = new Logger(EmailController.name);

  constructor(private readonly emailService: EmailService) {}

  @Post('send-password-reset')
  async sendPasswordReset(
    @Body() body: { email: string; resetLink: string },
  ): Promise<{ success: boolean }> {
    try {
      await this.emailService.sendPasswordResetEmail(body.email, body.resetLink);
      return { success: true };
    } catch (error) {
      this.logger.error('Error sending password reset email:', error);
      throw error;
    }
  }

  @Post('send-welcome')
  async sendWelcome(
    @Body() body: { email: string; name?: string },
  ): Promise<{ success: boolean }> {
    try {
      await this.emailService.sendWelcomeEmail(body.email, body.name);
      return { success: true };
    } catch (error) {
      this.logger.error('Error sending welcome email:', error);
      throw error;
    }
  }
}
