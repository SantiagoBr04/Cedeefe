// Variáveis para instâncias dos gráficos Chart.js
let geralChartInstance = null;
let disciplinasBarChartInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
    carregarEstatisticas();
});

// Busca as estatísticas do usuário autenticado no backend
async function carregarEstatisticas() {
    const token = typeof obterToken === 'function' ? obterToken() : (localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token'));
    const apiBase = 'http://localhost:3000/api';

    if (!token) {
        if (typeof redirecionarParaLogin === 'function') {
            redirecionarParaLogin('Acesso negado. Faça login para acessar suas estatísticas.');
        } else {
            window.location.href = 'login.html';
        }
        return;
    }

    const fetchOptions = {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    };

    try {
        const [geraisRes, areaRes] = await Promise.all([
            fetch(`${apiBase}/estatisticas/gerais`, fetchOptions),
            fetch(`${apiBase}/estatisticas/por-area`, fetchOptions)
        ]);

        if (!geraisRes.ok) {
            if (typeof tratarRespostaNaoAutorizada === 'function' && tratarRespostaNaoAutorizada(geraisRes)) {
                return;
            }
            throw new Error('Falha ao carregar estatísticas gerais.');
        }

        if (!areaRes.ok) {
            if (typeof tratarRespostaNaoAutorizada === 'function' && tratarRespostaNaoAutorizada(areaRes)) {
                return;
            }
            throw new Error('Falha ao carregar estatísticas por disciplina.');
        }

        const gerais = await geraisRes.json();
        const areas = await areaRes.json();

        // Renderiza os dados na tela
        renderizarCardsTotais(gerais);
        renderizarGraficoGeral(gerais);
        renderizarGraficoDisciplinasBar(areas);
        renderizarCardsDisciplinas(areas);

    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        renderizarErro();
    }
}

// Atualiza os 4 cards de métricas no topo
function renderizarCardsTotais(stats) {
    const totalQuestoes = Number(stats.total_questoes_respondidas || 0);
    const totalAcertos = Number(stats.total_acertos || 0);
    const totalErros = Number(stats.total_erros || 0);
    const totalListas = Number(stats.total_listas_finalizadas || 0);
    
    // Calcula a porcentagem real
    const taxaGeral = totalQuestoes > 0 ? ((totalAcertos / totalQuestoes) * 100) : Number(stats.aproveitamento_geral || 0);

    const elQuestoes = document.getElementById('total-questoes');
    const elTaxa = document.getElementById('taxa-acerto-geral');
    const elAcertos = document.getElementById('total-acertos');
    const elErros = document.getElementById('total-erros');
    const elListas = document.getElementById('total-listas');
    const elLegendaAcertos = document.getElementById('legenda-acertos');
    const elLegendaErros = document.getElementById('legenda-erros');
    const elCenterTaxa = document.getElementById('chart-center-taxa');

    if (elQuestoes) elQuestoes.textContent = totalQuestoes;
    if (elTaxa) elTaxa.textContent = `${taxaGeral.toFixed(1).replace('.', ',')}%`;
    if (elAcertos) elAcertos.textContent = totalAcertos;
    if (elErros) elErros.textContent = totalErros;
    if (elListas) elListas.textContent = totalListas;
    if (elLegendaAcertos) elLegendaAcertos.textContent = totalAcertos;
    if (elLegendaErros) elLegendaErros.textContent = totalErros;
    if (elCenterTaxa) elCenterTaxa.textContent = `${taxaGeral.toFixed(0)}%`;
}

// Renderiza o gráfico de rosca (Doughnut) de Acertos vs Erros
function renderizarGraficoGeral(stats) {
    const canvas = document.getElementById('geral-chart');
    if (!canvas) return;

    const acertos = Number(stats.total_acertos || 0);
    const erros = Number(stats.total_erros || 0);
    const total = acertos + erros;

    if (geralChartInstance) {
        geralChartInstance.destroy();
    }

    // Se não houver questões respondidas ainda, exibe um gráfico neutro
    const semDados = total === 0;
    const dataValues = semDados ? [1] : [acertos, erros];
    const bgColors = semDados ? ['#f0f0f0'] : ['#80C242', '#c23672']; // Verde do projeto e Rosa do projeto (Seção 12.2)
    const labels = semDados ? ['Sem dados'] : ['Acertos', 'Erros'];

    geralChartInstance = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: dataValues,
                backgroundColor: bgColors,
                borderWidth: 2,
                borderColor: '#ffffff',
                hoverOffset: semDados ? 0 : 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: !semDados,
                    callbacks: {
                        label: function (context) {
                            const val = context.parsed;
                            const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                            return ` ${context.label}: ${val} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Renderiza o gráfico de barras comparativo por disciplina
function renderizarGraficoDisciplinasBar(areas) {
    const canvas = document.getElementById('disciplinas-bar-chart');
    if (!canvas) return;

    if (disciplinasBarChartInstance) {
        disciplinasBarChartInstance.destroy();
    }

    if (!Array.isArray(areas) || areas.length === 0) {
        return;
    }

    // Paleta de cores oficial por disciplina (Seção 12.2)
    const paletaCores = ['#c23672', '#80C242', '#ff9cae', '#69a730', '#FFCAD4', '#538d24', '#a0285b', '#E9FFD3'];

    const labels = areas.map(a => a.disciplina_area?.descricao || 'Área');
    const dataTaxas = areas.map(a => {
        const totalFeitas = Number(a.total_questoes_respondidas || 0);
        const acertos = Number(a.total_acertos || 0);
        if (totalFeitas > 0) {
            return Number(((acertos / totalFeitas) * 100).toFixed(1));
        }
        return Number(Number(a.aproveitamento_area || 0).toFixed(1));
    });

    const coresBarras = areas.map((_, index) => paletaCores[index % paletaCores.length]);

    disciplinasBarChartInstance = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Aproveitamento (%)',
                data: dataTaxas,
                backgroundColor: coresBarras,
                borderRadius: 10,
                borderSkipped: false,
                maxBarThickness: 42
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function (value) {
                            return value + '%';
                        },
                        color: '#7b7b7b',
                        font: {
                            family: 'Poppins',
                            size: 11
                        }
                    },
                    grid: {
                        color: '#f4d6dd',
                        drawBorder: false
                    }
                },
                x: {
                    ticks: {
                        color: '#1f1f1f',
                        font: {
                            family: 'Poppins',
                            size: 11,
                            weight: '600'
                        }
                    },
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return ` Aproveitamento: ${context.parsed.y}%`;
                        }
                    }
                }
            }
        }
    });
}

// Renderiza a grade de cards individuais para cada disciplina
function renderizarCardsDisciplinas(areas) {
    const container = document.getElementById('areas-container');
    if (!container) return;

    container.innerHTML = '';

    if (!Array.isArray(areas) || areas.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="estado-vazio">
                    <div class="estado-vazio-icone">
                        <i class="bi bi-bar-chart-steps"></i>
                    </div>
                    <h4 class="estado-vazio-titulo">Nenhuma estatística disponível</h4>
                    <p class="estado-vazio-subtitulo">Resolva questões ou conclua listas para gerar dados detalhados por matéria.</p>
                    <a href="procurarQuestoes.html" class="btn btn-verde px-4 py-2">
                        <i class="bi bi-play-fill me-1"></i> Começar a Estudar
                    </a>
                </div>
            </div>
        `;
        return;
    }

    areas.forEach((area, index) => {
        const col = document.createElement('div');
        col.className = 'col-12 col-md-6 col-xl-4 disciplina-card-wrapper';
        col.style.animationDelay = `${(index * 0.05).toFixed(2)}s`;

        const title = area.disciplina_area?.descricao || 'Disciplina';
        const feitos = Number(area.total_questoes_respondidas || 0);
        const acertos = Number(area.total_acertos || 0);
        const erros = Number(area.total_erros || 0);
        
        let aproveitamento = feitos > 0 ? ((acertos / feitos) * 100) : Number(area.aproveitamento_area || 0);
        aproveitamento = Number(aproveitamento.toFixed(1));

        // Determina classe visual e gradiente da taxa
        let taxaClass = 'taxa-media';
        let progressoClass = 'progresso-amarelo';

        if (aproveitamento >= 70) {
            taxaClass = 'taxa-alta';
            progressoClass = 'progresso-verde';
        } else if (aproveitamento < 40) {
            taxaClass = 'taxa-baixa';
            progressoClass = 'progresso-rosa';
        }

        col.innerHTML = `
            <div class="disciplina-card">
                <div class="disciplina-card-header">
                    <span class="badge-disciplina">
                        <i class="bi bi-journal-bookmark-fill"></i> ${escapeHtml(title)}
                    </span>
                    <span class="taxa-badge ${taxaClass}">
                        ${aproveitamento}%
                    </span>
                </div>

                <div class="disciplina-progresso-bar-bg">
                    <div class="disciplina-progresso-bar-fill ${progressoClass}" style="width: ${aproveitamento}%;"></div>
                </div>

                <div class="disciplina-metricas-grid">
                    <div class="disciplina-metrica-item">
                        <small>Feitas</small>
                        <strong>${feitos}</strong>
                    </div>
                    <div class="disciplina-metrica-item">
                        <small>Acertos</small>
                        <strong class="text-verde">${acertos}</strong>
                    </div>
                    <div class="disciplina-metrica-item">
                        <small>Erros</small>
                        <strong class="text-rosa">${erros}</strong>
                    </div>
                </div>

                <div class="mt-auto pt-2">
                    <a href="procurarQuestoes.html" class="btn btn-outline-verde w-100 py-2">
                        <i class="bi bi-arrow-right-circle"></i> Praticar Matéria
                    </a>
                </div>
            </div>
        `;

        container.appendChild(col);
    });
}

// Exibe mensagem de erro caso o carregamento falhe
function renderizarErro() {
    const container = document.getElementById('areas-container');
    if (container) {
        container.innerHTML = `
            <div class="col-12">
                <div class="estado-vazio">
                    <div class="estado-vazio-icone" style="background-color: #fee2e2; color: #dc2626;">
                        <i class="bi bi-exclamation-triangle-fill"></i>
                    </div>
                    <h4 class="estado-vazio-titulo">Erro ao carregar estatísticas</h4>
                    <p class="estado-vazio-subtitulo">Não foi possível recuperar seus dados no momento. Verifique sua conexão com o servidor.</p>
                    <button class="btn btn-outline-rosa px-4 py-2" onclick="carregarEstatisticas()">
                        <i class="bi bi-arrow-clockwise me-1"></i> Tentar Novamente
                    </button>
                </div>
            </div>
        `;
    }
}

// Utilitário para sanitização básica de strings no HTML
function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}