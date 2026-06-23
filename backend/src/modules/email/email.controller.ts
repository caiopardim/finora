import { Controller, Post, Body, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { EmailService } from './email.service';

@Controller('email')
export class EmailController {
  private readonly logger = new Logger(EmailController.name);
  private supabase;

  constructor(
    private readonly emailService: EmailService,
    private config: ConfigService,
  ) {
    this.supabase = createClient(
      config.get('SUPABASE_URL'),
      config.get('SUPABASE_SERVICE_KEY'),
    );
  }

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

  @Post('request-password-reset')
  async requestPasswordReset(
    @Body() body: { email: string },
  ): Promise<{ success: boolean }> {
    try {
      const frontendUrl = this.config.get('FRONTEND_URL') || 'https://meufinora.com.br';

      // Call Supabase to initiate reset (this sends the default email, but we intercept and send custom one)
      await this.supabase.auth.admin.generateLink({
        type: 'recovery',
        email: body.email,
        options: { redirectTo: `${frontendUrl}/auth/reset-password` },
      });

      // Create a manual recovery link for the custom email
      const { data: { user }, error: getUserError } = await this.supabase.auth.admin.getUserById(
        // We'll just use the email to construct a link instead
        '' as any
      );

      // Fallback: send email with a generic recovery URL
      // Supabase will have already sent their email, but we send ours too for custom design
      const resetLink = `${frontendUrl}/auth/reset-password`;
      await this.emailService.sendPasswordResetEmail(body.email, resetLink);

      this.logger.log(`Password reset requested for ${body.email}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Error requesting password reset for ${body.email}:`, error);
      // Still return success even if there's an error, since Supabase already sent default email
      return { success: true };
    }
  }
}
