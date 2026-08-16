document.addEventListener('DOMContentLoaded', async () => {
    const API_URL = '/api';
    const token = localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token');

    const dataHojeSpan = document.getElementById('dashboard-data-texto');
    const greetingHeader = document.getElementById('admin-nome-greeting');
    const reportadasBadge = document.getElementById('reportadas-badge');
    const reportadasContainer = document.getElementById('reportadas-container');
    const ultimasQuestoesContainer = document.getElementById('ultimas-questoes-container');
    const btnAdicionarQuestao = document.getElementById('btn-adicionar-questao');
    const canvasGrafico = document.getElementById('graficoDisciplinas');
    const statTotalReportes = document.getElementById('stat-total-reportes');
    const statTotalDisciplinas = document.getElementById('stat-total-disciplinas');

    let meuGraficoDisciplinas = null;

    // 1. Data atual formatada
    function atualizarDataAtual() {
        if (!dataHojeSpan) return;
        const agora = new Date();
        const dia = String(agora.getDate()).padStart(2, '0');
        const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const mes = meses[agora.getMonth()];
        const ano = agora.getFullYear();
        dataHojeSpan.textContent = `${dia} de ${mes}, ${ano}`;
    }

    // 2. Saudação personalizada
    function atualizarCumprimento() {
        if (!greetingHeader) return;
        try {
            const usuarioSalvo = localStorage.getItem('usuario') || sessionStorage.getItem('usuario');
            if (usuarioSalvo) {
                const usuarioObj = JSON.parse(usuarioSalvo);
                const primeiroNome = usuarioObj.nome_completo ? usuarioObj.nome_completo.split(' ')[0] : (usuarioObj.login || 'Administrador');
                greetingHeader.textContent = `Olá, ${primeiroNome}!`;
            }
        } catch (e) {
            console.warn('Não foi possível ler os dados do usuário para a saudação:', e);
        }
    }

    // 3. Formatação relativa de data
    function formatarDataRelativa(dataString) {
        if (!dataString) return 'Recente';
        const dataCriacao = new Date(dataString);
        const hoje = new Date();
        
        dataCriacao.setHours(0, 0, 0, 0);
        hoje.setHours(0, 0, 0, 0);

        const diffTempo = Math.abs(hoje - dataCriacao);
        const diffDias = Math.ceil(diffTempo / (1000 * 60 * 60 * 24));

        if (diffDias === 0) return 'Hoje';
        if (diffDias === 1) return 'Ontem';
        if (diffDias < 7) return `Há ${diffDias} dias`;
        return dataCriacao.toLocaleDateString('pt-BR');
    }

    // 4. Ação do Botão Adicionar Questão
    if (btnAdicionarQuestao) {
        btnAdicionarQuestao.addEventListener('click', () => {
            window.location.href = 'adicionarQuestao.html';
        });
    }

    // 5. Busca de dados do dashboard
    async function carregarDadosDashboard() {
        try {
            const response = await fetch(`${API_URL}/admin/dashboard-stats`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Falha ao carregar estatísticas do dashboard.');
            }

            const dados = await response.json();

            // Atualiza contadores dos cards
            if (statTotalReportes) statTotalReportes.textContent = dados.totalReportesPendentes || 0;
            if (statTotalDisciplinas && Array.isArray(dados.disciplinasMaisEstudadas)) {
                statTotalDisciplinas.textContent = dados.disciplinasMaisEstudadas.length;
            }

            renderizarReportes(dados.totalReportesPendentes, dados.questoesReportadas);
            renderizarUltimasQuestoes(dados.ultimasQuestoes);
            renderizarGrafico(dados.disciplinasMaisEstudadas);

        } catch (error) {
            console.error('Erro ao carregar dashboard admin:', error);
        }
    }

    // 6. Renderização das Questões Reportadas
    function renderizarReportes(total, reportes) {
        if (reportadasBadge) {
            reportadasBadge.textContent = `${total || 0} ${total === 1 ? 'pendente' : 'pendentes'}`;
        }

        if (!reportadasContainer) return;
        reportadasContainer.innerHTML = '';

        if (!reportes || reportes.length === 0) {
            reportadasContainer.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-check2-circle text-verde fs-2 d-block mb-2"></i>
                    <p class="text-muted mb-0">Nenhuma questão reportada pendente no momento!</p>
                </div>
            `;
            return;
        }

        reportes.forEach(rep => {
            const divItem = document.createElement('div');
            divItem.className = 'questao-reportada';
            divItem.innerHTML = `
                <div class="questao-info">
                    <h5>Questão #${rep.cod}</h5>
                    <p><i class="bi bi-tag-fill me-1"></i> ${escapeHtml(rep.disciplina)}</p>
                    <small>${escapeHtml(rep.motivo)}${rep.descricao_detalhada ? `: ${escapeHtml(rep.descricao_detalhada)}` : ''}</small>
                </div>
                <button type="button" class="btn btn-rosa btn-sm btn-resolver-reporte" data-cod="${rep.cod}">
                    <i class="bi bi-tools me-1"></i> Resolver
                </button>
            `;

            divItem.querySelector('.btn-resolver-reporte').addEventListener('click', () => {
                window.location.href = `questoesReportadas.html?questaoCod=${rep.cod}`;
            });

            reportadasContainer.appendChild(divItem);
        });
    }

    // 7. Renderização das Últimas Questões
    function renderizarUltimasQuestoes(questoes) {
        if (!ultimasQuestoesContainer) return;
        ultimasQuestoesContainer.innerHTML = '';

        if (!questoes || questoes.length === 0) {
            ultimasQuestoesContainer.innerHTML = `
                <li class="text-center py-3 text-muted">
                    <p class="mb-0">Nenhuma questão cadastrada recentemente.</p>
                </li>
            `;
            return;
        }

        questoes.forEach(q => {
            const liItem = document.createElement('li');
            liItem.innerHTML = `
                <div>
                    <strong>${escapeHtml(q.disciplina)}</strong>
                    <span>${escapeHtml(q.tema)}</span>
                </div>
                <span class="badge-tempo-relativo">
                    <i class="bi bi-clock-history me-1"></i> ${formatarDataRelativa(q.data)}
                </span>
            `;
            ultimasQuestoesContainer.appendChild(liItem);
        });
    }

    // 8. Renderização do Gráfico Chart.js com as regras da Seção 12.2
    function renderizarGrafico(disciplinasStats) {
        if (!canvasGrafico || typeof Chart === 'undefined') {
            console.warn('Chart.js não está carregado ou elemento canvas não encontrado.');
            return;
        }

        const labels = disciplinasStats && disciplinasStats.length > 0 
            ? disciplinasStats.map(d => d.disciplina)
            : ['Matemática', 'Português', 'Biologia', 'Química', 'Física', 'Geografia'];

        const valores = disciplinasStats && disciplinasStats.length > 0
            ? disciplinasStats.map(d => d.total)
            : [0, 0, 0, 0, 0, 0];

        // Paleta Oficial da Seção 12.2 do GEMINI.md
        const paletaOficial = ['#c23672', '#80C242', '#ff9cae', '#69a730', '#FFCAD4', '#538d24', '#a0285b', '#E9FFD3'];

        if (meuGraficoDisciplinas) {
            meuGraficoDisciplinas.destroy();
        }

        const ctx = canvasGrafico.getContext('2d');
        meuGraficoDisciplinas = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Resoluções / Questões',
                    data: valores,
                    backgroundColor: paletaOficial.slice(0, labels.length),
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#1f1f1f',
                        padding: 12,
                        cornerRadius: 10,
                        callbacks: {
                            label: function(context) {
                                return ` ${context.raw} resoluções registradas`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                family: 'Poppins',
                                size: 12,
                                weight: 500
                            },
                            color: '#4b5563'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.04)'
                        },
                        ticks: {
                            precision: 0,
                            font: {
                                family: 'Poppins',
                                size: 11
                            },
                            color: '#7b7b7b'
                        }
                    }
                }
            }
        });
    }

    function escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Inicializações
    atualizarDataAtual();
    atualizarCumprimento();
    await carregarDadosDashboard();
});
