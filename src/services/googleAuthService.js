import { OAuth2Client } from 'google-auth-library';

/**
 * Serviço responsável por validar e decodificar tokens JWT do Google Sign-In (OAuth 2.0).
 */
class GoogleAuthService {
    /**
     * Instancia o cliente da SDK oficial do Google Auth
     */
    getClient() {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        if (!clientId || clientId === 'seu_google_client_id.apps.googleusercontent.com') {
            console.warn('[GoogleAuthService] AVISO: GOOGLE_CLIENT_ID não configurado no .env.');
        }
        return new OAuth2Client(clientId);
    }

    /**
     * Valida a assinatura do token recebido pelo Google Identity Services
     */
    async verifyIdToken(credentialToken) {
        try {
            const client = this.getClient();
            const clientId = process.env.GOOGLE_CLIENT_ID;

            const ticket = await client.verifyIdToken({
                idToken: credentialToken,
                audience: clientId && clientId !== 'seu_google_client_id.apps.googleusercontent.com' ? clientId : undefined
            });

            const payload = ticket.getPayload();

            if (!payload || !payload.email) {
                throw new Error('Token do Google não contém um e-mail válido.');
            }

            return {
                email: payload.email,
                name: payload.name || payload.given_name || 'Usuário Google',
                picture: payload.picture || null,
                googleId: payload.sub,
                emailVerified: Boolean(payload.email_verified)
            };
        } catch (error) {
            console.error('[GoogleAuthService] Erro na validação do token do Google:', error.message || error);
            throw error;
        }
    }
}

export default new GoogleAuthService();
