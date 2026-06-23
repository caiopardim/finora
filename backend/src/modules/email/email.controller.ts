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
  ): Promise<{ success: boolean; message?: string }> {
    this.logger.log(`Password reset requested for: ${body.email}`);

    try {
      if (!body.email) {
        throw new Error('Email is required');
      }

      const frontendUrl = this.config.get('FRONTEND_URL') || 'https://meufinora.com.br';
      const redirectUrl = `${frontendUrl}/auth/reset-password`;

      this.logger.log(`Generating recovery link for ${body.email}...`);

      // Generate recovery link using Supabase Admin API
      const { data, error } = await this.supabase.auth.admin.generateLink({
        type: 'recovery',
        email: body.email,
        options: { redirectTo: redirectUrl },
      });

      if (error) {
        this.logger.error(`Supabase generateLink failed:`, error);
        throw new Error(`Failed to generate link: ${JSON.stringify(error)}`);
      }

      const recoveryLink = data?.properties?.action_link;
      if (!recoveryLink) {
        this.logger.error(`No action_link in response:`, data);
        throw new Error('No recovery link generated');
      }

      this.logger.log(`Recovery link generated, sending email...`);

      // Send email via Resend with custom template
      await this.emailService.sendPasswordResetEmail(body.email, recoveryLink);

      this.logger.log(`Password reset email sent via Resend for ${body.email}`);
      return { success: true, message: 'Email sent successfully' };
    } catch (error) {
      this.logger.error(`Error in password reset:`, error.message, error.stack);
      return {
        success: false,
        message: error.message || 'Failed to send password reset email'
      };
    }
  }
}
