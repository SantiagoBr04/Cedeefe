/**
 * Serviço responsável pela integração com a API v3 do Brevo (Sendinblue)
 * para o envio de e-mails transacionais (Verificação de Conta e Recuperação de Senha).
 */
class BrevoService {
    /**
     * Obtém a chave de API do Brevo configurada no .env
     */
    getApiKey() {
        const apiKey = process.env.BREVO_API_KEY;
        if (!apiKey || apiKey === 'xkeysib_placeholder') {
            console.warn('[BrevoService] AVISO: BREVO_API_KEY não configurada no .env. E-mails não serão enviados.');
            return null;
        }
        return apiKey;
    }

    /**
     * E-mail do remetente cadastrado no Brevo
     */
    getFromEmail() {
        return process.env.BREVO_FROM_EMAIL || 'seu_email_cadastrado_no_brevo@gmail.com';
    }

    /**
     * URL base do frontend para links dos e-mails
     */
    getFrontendUrl() {
        return process.env.FRONTEND_URL || 'http://localhost:3000';
    }

    /**
     * Envia um e-mail transacional utilizando a API REST v3 oficial do Brevo
     */
    async sendEmail({ toEmail, userName, subject, htmlContent }) {
        try {
            const apiKey = this.getApiKey();
            if (!apiKey) return { success: false, message: 'Brevo não configurado' };

            const response = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'api-key': apiKey,
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    sender: { name: 'Cedeefe', email: this.getFromEmail() },
                    to: [{ email: toEmail, name: userName || toEmail }],
                    subject: subject,
                    htmlContent: htmlContent
                })
            });

            const data = await response.json();

            if (!response.ok) {
                console.error(`[BrevoService] Erro ${response.status} da API Brevo ao enviar para ${toEmail}:`, data);
                return { success: false, error: data };
            }

            console.log(`[BrevoService] E-mail enviado com sucesso para ${toEmail}. MessageId:`, data.messageId);
            return { success: true, data };
        } catch (error) {
            console.error(`[BrevoService] Erro de conexão ao enviar e-mail para ${toEmail}:`, error.message || error);
            return { success: false, error };
        }
    }

    /**
     * Envia o e-mail de verificação de conta para novos cadastros
     */
    async sendVerificationEmail(toEmail, userName, token) {
        const verificationUrl = `${this.getFrontendUrl()}/pages/verificarEmail.html?token=${token}`;
        const htmlContent = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
                <h2 style="color: #2c3e50; text-align: center;">Bem-vindo ao Cedeefe! 🎓</h2>
                <p>Olá, <strong>${userName}</strong>!</p>
                <p>Obrigado por criar sua conta na nossa plataforma de estudos. Para ativar seu acesso e começar a praticar com questões e flashcards, confirme seu endereço de e-mail clicando no botão abaixo:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verificationUrl}" style="background-color: #28a745; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verificar Meu E-mail</a>
                </div>
                <p style="font-size: 14px; color: #666666;">Se o botão acima não funcionar, você também pode copiar e colar o link a seguir no seu navegador:</p>
                <p style="font-size: 13px; color: #0066cc; word-break: break-all;">${verificationUrl}</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
                <p style="font-size: 12px; color: #999999; text-align: center;">Este link expira em 24 horas. Se você não criou esta conta, por favor ignore este e-mail.</p>
            </div>
        `;

        return this.sendEmail({
            toEmail,
            userName,
            subject: 'Confirme seu e-mail de cadastro no Cedeefe',
            htmlContent
        });
    }

    /**
     * Envia o e-mail para redefinição de senha
     */
    async sendPasswordResetEmail(toEmail, userName, token) {
        const resetUrl = `${this.getFrontendUrl()}/pages/redefinirSenha.html?token=${token}`;
        const htmlContent = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
                <h2 style="color: #2c3e50; text-align: center;">Solicitação de Nova Senha 🔐</h2>
                <p>Olá, <strong>${userName}</strong>!</p>
                <p>Recebemos uma solicitação para redefinir a senha da sua conta no Cedeefe. Clique no botão abaixo para escolher uma nova senha:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" style="background-color: #d9534f; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Redefinir Minha Senha</a>
                </div>
                <p style="font-size: 14px; color: #666666;">Se o botão acima não funcionar, copie e cole o link a seguir no seu navegador:</p>
                <p style="font-size: 13px; color: #0066cc; word-break: break-all;">${resetUrl}</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
                <p style="font-size: 12px; color: #999999; text-align: center;">Este link expira em 1 hora. Se você não solicitou a alteração de senha, fique tranquilo: sua conta continua segura e você pode ignorar este e-mail.</p>
            </div>
        `;

        return this.sendEmail({
            toEmail,
            userName,
            subject: 'Recuperação de Senha - Cedeefe',
            htmlContent
        });
    }
}

export default new BrevoService();
