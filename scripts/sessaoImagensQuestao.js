/**
 * Classe para gerenciar o ciclo de vida das imagens de uma questão durante a edição.
 * Uma instância é compartilhada entre todos os editores de uma mesma questão (enunciado, explicação, alternativas).
 */
class SessaoImagensQuestao {
    constructor(idQuestao = null) {
        this.idQuestao = idQuestao; // Pode ser nulo se for nova questão
        this.imagensEnviadas = new Set();
        this.vincularEventosDeSaida();
    }

    /**
     * Registra uma imagem enviada para o servidor.
     */
    registrar(url) {
        if (url) {
            this.imagensEnviadas.add(url);
        }
    }

    /**
     * Extrai todas as URLs de imagens do Cloudinary presentes em um ou mais HTMLs.
     */
    extrairUrlsImagensHtml(htmls) {
        const urls = new Set();
        const regex = /<img[^>]+src="([^">]+)"/gi;
        
        for (const html of htmls) {
            if (!html) continue;
            let match;
            while ((match = regex.exec(html)) !== null) {
                const url = match[1];
                if (url && url.includes('cloudinary.com')) {
                    urls.add(url);
                }
            }
        }
        return urls;
    }

    /**
     * Chamado após o salvamento bem-sucedido da questão.
     * Descarta apenas as imagens que foram enviadas nesta sessão mas que não estão nos HTMLs finais.
     */
    async finalizar(...htmlsSalvos) {
        if (this.imagensEnviadas.size === 0) return;

        const urlsUsadas = this.extrairUrlsImagensHtml(htmlsSalvos);
        const urlsParaDescartar = [];

        for (const url of this.imagensEnviadas) {
            if (!urlsUsadas.has(url)) {
                urlsParaDescartar.push(url);
            }
        }

        if (urlsParaDescartar.length > 0) {
            await this.descartar(urlsParaDescartar);
        }
        
        // Limpa a sessão
        this.imagensEnviadas.clear();
    }

    /**
     * Chamado quando o usuário cancela a edição. Descarta todas as imagens enviadas.
     */
    async descartarTudo() {
        if (this.imagensEnviadas.size > 0) {
            await this.descartar(Array.from(this.imagensEnviadas));
            this.imagensEnviadas.clear();
        }
    }

    /**
     * Função interna para chamar o endpoint de descarte.
     */
    async descartar(urls) {
        try {
            const token = localStorage.getItem('jwt_token');
            if (!token) return;

            const API_URL = typeof window.API_BASE_URL !== 'undefined' ? window.API_BASE_URL : '/api';
            await fetch(`${API_URL}/questoes/imagens/descartar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ urls })
            });
        } catch (erro) {
            console.error('[SessaoImagensQuestao] Erro ao descartar imagens:', erro);
        }
    }

    /**
     * Vincula eventos window para descartar imagens caso o usuário saia da página ou feche a aba.
     */
    vincularEventosDeSaida() {
        const handleDescarteSincrono = () => {
            if (this.imagensEnviadas.size > 0) {
                const token = localStorage.getItem('jwt_token');
                if (!token) return;

                const urls = Array.from(this.imagensEnviadas);
                
                // Usar sendBeacon para garantir que a requisição seja enviada quando a aba fechar
                const blob = new Blob([JSON.stringify({ urls })], { type: 'application/json' });
                // Enviar header Authorization via fetch keepalive (sendBeacon não suporta headers customizados)
                const API_URL = typeof window.API_BASE_URL !== 'undefined' ? window.API_BASE_URL : '/api';
                fetch(`${API_URL}/questoes/imagens/descartar`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ urls }),
                    keepalive: true
                }).catch(() => {
                    // Fallback silencioso
                });
            }
        };

        window.addEventListener('beforeunload', handleDescarteSincrono);
        window.addEventListener('pagehide', handleDescarteSincrono);
    }
}

window.SessaoImagensQuestao = SessaoImagensQuestao;
