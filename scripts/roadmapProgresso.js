/**
 * Script de Sincronização e Exibição de Progresso dos Roadmaps
 * Conecta os checkboxes e marcadores visuais das páginas com a API backend Cedeefe
 */

const TOTAL_TOPICOS = {
    biologia: 38,
    fisica: 15,
    geografia: 14,
    historia: 34,
    matematica: 41,
    portugues: 23,
    quimica: 15
};

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token');
    if (!token) return;

    const API_BASE_URL = 'http://localhost:3000/api/roadmaps';

    // ====================================================
    // CASO 1: PÁGINA PRINCIPAL DOS ROADMAPS (roadmaps.html)
    // ====================================================
    const cardsContainer = document.querySelector('.acessoMateria');
    if (cardsContainer) {
        try {
            const response = await fetch(`${API_BASE_URL}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const progressoGeral = await response.json();

                Object.keys(TOTAL_TOPICOS).forEach(slug => {
                    const concluidos = (progressoGeral[slug] || []).length;
                    const total = TOTAL_TOPICOS[slug];
                    const percent = Math.min(100, Math.round((concluidos / total) * 100));

                    const barFill = document.getElementById(`card-bar-${slug}`);
                    const textLabel = document.getElementById(`card-text-${slug}`);

                    if (barFill) barFill.style.width = `${percent}%`;
                    if (textLabel) textLabel.textContent = `${percent}% concluído (${concluidos}/${total})`;
                });
            }
        } catch (error) {
            console.error('Erro ao carregar progresso geral dos roadmaps:', error);
        }
        return;
    }

    // ====================================================
    // CASO 2: PÁGINA INDIVIDUAL DA DISCIPLINA (roadmapBio.html, etc.)
    // ====================================================
    const containerRoadmap = document.querySelector('[data-roadmap]');
    if (!containerRoadmap) return;

    const disciplina = containerRoadmap.getAttribute('data-roadmap');
    if (!disciplina) return;

    // Função interna para atualizar a barra de progresso visual da disciplina
    const atualizarBarraProgresso = () => {
        const checkboxes = document.querySelectorAll('input[type="checkbox"][data-topico-id]');
        const total = checkboxes.length;
        const marcados = document.querySelectorAll('input[type="checkbox"][data-topico-id]:checked').length;
        const percent = total > 0 ? Math.round((marcados / total) * 100) : 0;

        const progressBarFill = document.getElementById('roadmap-progress-bar');
        const progressPercentageText = document.getElementById('progress-percentage-text');
        const progressCountText = document.getElementById('progress-count-text');

        if (progressBarFill) {
            progressBarFill.style.width = `${percent}%`;
        }
        if (progressPercentageText) {
            progressPercentageText.textContent = `${percent}% (${marcados}/${total})`;
        }
        if (progressCountText) {
            progressCountText.textContent = `${marcados} de ${total} tópicos concluídos`;
        }
    };

    // 1. Carrega o progresso salvo no backend para a disciplina
    try {
        const response = await fetch(`${API_BASE_URL}/${disciplina}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            const topicosConcluidos = new Set(data.progresso || []);

            const checkboxes = document.querySelectorAll('input[type="checkbox"][data-topico-id]');
            checkboxes.forEach(checkbox => {
                const topicoId = checkbox.getAttribute('data-topico-id');
                if (topicosConcluidos.has(topicoId)) {
                    checkbox.checked = true;
                }
            });
        }
    } catch (error) {
        console.error('Erro de conexão ao carregar progresso do roadmap:', error);
    } finally {
        // Atualiza a barra de progresso visual inicial
        atualizarBarraProgresso();
    }

    // 2. Ouve alterações nos checkboxes para salvar no servidor e atualizar a barra
    const checkboxes = document.querySelectorAll('input[type="checkbox"][data-topico-id]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', async () => {
            const topicoId = checkbox.getAttribute('data-topico-id');
            const estaConcluido = checkbox.checked;

            // Atualiza visualmente de forma instantânea para UX responsiva
            atualizarBarraProgresso();

            try {
                const response = await fetch(`${API_BASE_URL}/${disciplina}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        topico_id: topicoId,
                        concluido: estaConcluido
                    })
                });

                if (!response.ok) {
                    console.error('Erro ao salvar progresso do tópico:', response.statusText);
                    // Reverte se falhou na API
                    checkbox.checked = !estaConcluido;
                    atualizarBarraProgresso();
                }
            } catch (error) {
                console.error('Erro de rede ao salvar progresso do tópico:', error);
                checkbox.checked = !estaConcluido;
                atualizarBarraProgresso();
            }
        });
    });
});
