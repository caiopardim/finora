import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly resend: Resend;
  private readonly logger = new Logger(EmailService.name);

  constructor(private config: ConfigService) {
    const apiKey = config.get('RESEND_API_KEY');
    this.resend = new Resend(apiKey);
  }

  async sendPasswordResetEmail(email: string, resetLink: string): Promise<void> {
    try {
      const resetUrl = resetLink;

      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">

          <!-- Logo -->
          <div style="text-align: center; margin-bottom: 32px;">
            <img src="https://meufinora.com.br/logo-finora.svg" alt="Finora" style="height: 40px;">
          </div>

          <!-- Main content -->
          <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #f1f5f9; padding: 40px; border-radius: 12px;">

            <h1 style="margin: 0 0 16px 0; font-size: 28px; font-weight: 700;">Redefinir sua senha</h1>

            <p style="margin: 0 0 24px 0; font-size: 16px; color: #cbd5e1;">
              Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para escolher uma nova.
            </p>

            <!-- Button -->
            <div style="margin: 32px 0;">
              <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(34, 197, 94, 0.35);">
                Redefinir Senha
              </a>
            </div>

            <p style="margin: 24px 0 0 0; font-size: 14px; color: #94a3b8;">
              Se você não solicitou isso, pode ignorar com segurança este e-mail.
            </p>

            <hr style="border: none; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 32px 0;">

            <p style="margin: 16px 0 0 0; font-size: 12px; color: #64748b; text-align: center;">
              © 2026 Finora IA. Suas finanças, no WhatsApp.
            </p>

          </div>

        </div>
      `;

      await this.resend.emails.send({
        from: 'noreply@meufinora.com.br',
        to: email,
        subject: 'Redefinir sua senha',
        html,
      });

      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}:`, error);
      throw error;
    }
  }

  async sendWelcomeEmail(email: string, name?: string): Promise<void> {
    try {
      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">

          <div style="text-align: center; margin-bottom: 32px;">
            <img src="https://meufinora.com.br/logo-finora.svg" alt="Finora" style="height: 40px;">
          </div>

          <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #f1f5f9; padding: 40px; border-radius: 12px;">

            <h1 style="margin: 0 0 16px 0; font-size: 28px; font-weight: 700;">Bem-vindo ao Finora! 🐷</h1>

            <p style="margin: 0 0 24px 0; font-size: 16px; color: #cbd5e1;">
              ${name ? `Oi ${name}! ` : ''}Sua conta foi criada com sucesso. Agora você pode começar a controlar suas finanças pelo WhatsApp!
            </p>

            <div style="background: rgba(34, 197, 94, 0.1); border-left: 4px solid #22c55e; padding: 16px; border-radius: 8px; margin: 24px 0;">
              <p style="margin: 0; font-size: 14px; color: #cbd5e1;">
                <strong>Próximos passos:</strong><br>
                1. Acesse o dashboard: <a href="https://meufinora.com.br/dashboard" style="color: #22c55e;">https://meufinora.com.br/dashboard</a><br>
                2. Conecte seu WhatsApp<br>
                3. Comece a registrar seus gastos!
              </p>
            </div>

            <hr style="border: none; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 32px 0;">

            <p style="margin: 16px 0 0 0; font-size: 12px; color: #64748b; text-align: center;">
              © 2026 Finora IA. Suas finanças, no WhatsApp.
            </p>

          </div>

        </div>
      `;

      await this.resend.emails.send({
        from: 'noreply@meufinora.com.br',
        to: email,
        subject: 'Bem-vindo ao Finora!',
        html,
      });

      this.logger.log(`Welcome email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}:`, error);
      throw error;
    }
  }
}
