import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port: this.configService.get<number>('MAIL_PORT'),
      secure: false,
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASS'),
      },
    });
  }

  async enviarEmailVerificacao(
    destinatario: string,
    nome: string,
    token: string,
  ): Promise<void> {
    const url = `${this.configService.get<string>('APP_URL')}/auth/verificar-email?token=${token}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verificação de Email - Desbrava Provas</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #2563eb; padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Desbrava Provas</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px;">Olá, ${nome}!</h2>
              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Bem-vindo ao <strong>Desbrava Provas</strong>! Estamos felizes em ter você conosco.
              </p>
              <p style="margin: 0 0 30px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Para começar a usar sua conta, precisamos verificar seu endereço de email. Clique no botão abaixo para confirmar:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${url}" style="display: inline-block; padding: 16px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
                      Verificar Email
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 30px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Se você não criou uma conta no Desbrava Provas, ignore este email.
              </p>
              <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Caso o botão não funcione, copie e cole o seguinte link no seu navegador:
              </p>
              <p style="margin: 10px 0 0 0; color: #2563eb; font-size: 12px; word-break: break-all;">
                ${url}
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                © ${new Date().getFullYear()} Desbrava Provas. Todos os direitos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    try {
      await this.transporter.sendMail({
        from: `"Desbrava Provas" <${this.configService.get<string>('MAIL_FROM')}>`,
        to: destinatario,
        subject: 'Verifique seu email - Desbrava Provas',
        html,
        encoding: 'utf-8',
        textEncoding: 'base64',
        headers: {
          'Content-Type': 'text/html; charset=UTF-8',
        },
      });

      this.logger.log(`Email de verificação enviado para ${destinatario}`);
    } catch (error) {
      this.logger.error(
        `Erro ao enviar email para ${destinatario}: ${error.message}`,
      );
      throw error;
    }
  }

  async enviarEmailBoasVindas(
    destinatario: string,
    nome: string,
  ): Promise<void> {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Boas-vindas - Desbrava Provas</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #10b981; padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px;">🎉 Bem-vindo!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px;">Olá, ${nome}!</h2>
              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Seu email foi verificado com sucesso! Agora você tem acesso completo à plataforma <strong>Desbrava Provas</strong>.
              </p>
              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Explore nossa plataforma e comece a criar e resolver provas de especialidades.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${this.configService.get<string>('APP_URL')}" style="display: inline-block; padding: 16px 32px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
                      Acessar Plataforma
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                © ${new Date().getFullYear()} Desbrava Provas. Todos os direitos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    try {
      await this.transporter.sendMail({
        from: `"Desbrava Provas" <${this.configService.get<string>('MAIL_FROM')}>`,
        to: destinatario,
        subject: 'Boas-vindas ao Desbrava Provas!',
        html,
        encoding: 'utf-8',
        textEncoding: 'base64',
        headers: {
          'Content-Type': 'text/html; charset=UTF-8',
        },
      });

      this.logger.log(`Email de boas-vindas enviado para ${destinatario}`);
    } catch (error) {
      this.logger.error(
        `Erro ao enviar email para ${destinatario}: ${error.message}`,
      );
      throw error;
    }
  }

  async enviarEmailRecuperacaoSenha(
    destinatario: string,
    nome: string,
    token: string,
  ): Promise<void> {
    const url = `${this.configService.get<string>('APP_URL')}/auth/redefinir-senha?token=${token}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperação de Senha - Desbrava Provas</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #dc2626; padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px;">🔐 Recuperação de Senha</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px;">Olá, ${nome}!</h2>
              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Recebemos uma solicitação para redefinir a senha da sua conta no <strong>Desbrava Provas</strong>.
              </p>
              <p style="margin: 0 0 30px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Clique no botão abaixo para criar uma nova senha. Este link é válido por <strong>1 hora</strong>.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${url}" style="display: inline-block; padding: 16px 32px; background-color: #dc2626; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
                      Redefinir Senha
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 30px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                <strong>Não solicitou esta alteração?</strong><br>
                Se você não pediu para redefinir sua senha, ignore este email. Sua senha permanecerá inalterada.
              </p>
              <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Caso o botão não funcione, copie e cole o seguinte link no seu navegador:
              </p>
              <p style="margin: 10px 0 0 0; color: #dc2626; font-size: 12px; word-break: break-all;">
                ${url}
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                © ${new Date().getFullYear()} Desbrava Provas. Todos os direitos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    try {
      await this.transporter.sendMail({
        from: `"Desbrava Provas" <${this.configService.get<string>('MAIL_FROM')}>`,
        to: destinatario,
        subject: 'Recuperação de Senha - Desbrava Provas',
        html,
        encoding: 'utf-8',
        textEncoding: 'base64',
        headers: {
          'Content-Type': 'text/html; charset=UTF-8',
        },
      });

      this.logger.log(`Email de recuperação enviado para ${destinatario}`);
    } catch (error) {
      this.logger.error(
        `Erro ao enviar email para ${destinatario}: ${error.message}`,
      );
      throw error;
    }
  }
}
