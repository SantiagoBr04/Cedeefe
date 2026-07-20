document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('jwt_token');
    const devMode = false;
    const apiBase = 'http://localhost:3000/api';

    if (!token && !devMode) {
        window.location.href = 'login.html';
        return;
    }

    const fetchOptions = {
        headers: {
            Authorization: `Bearer ${token}`
        }
    };

    if (devMode) {
        renderGeralChart({ total_acertos: 72, total_erros: 28 });
        renderTotals({ total_questoes_respondidas: 100, total_listas_finalizadas: 14 });
        renderAreas([
            { disciplina_area: { descricao: 'Matemática' }, total_questoes_respondidas: 22, total_acertos: 18, total_erros: 4, aproveitamento_area: 81.82 },
            { disciplina_area: { descricao: 'Português' }, total_questoes_respondidas: 18, total_acertos: 13, total_erros: 5, aproveitamento_area: 72.22 }
        ]);
        return;
    }

    try {
        const [geraisRes, areaRes] = await Promise.all([
            fetch(`${apiBase}/estatisticas/gerais`, fetchOptions),
            fetch(`${apiBase}/estatisticas/por-area`, fetchOptions)
        ]);

        if (!geraisRes.ok) {
            throw new Error('Falha ao carregar estatísticas gerais.');
        }

        if (!areaRes.ok) {
            throw new Error('Falha ao carregar estatísticas por área.');
        }

        const gerais = await geraisRes.json();
        const areas = await areaRes.json();

        renderTotals(gerais);
        renderGeralChart(gerais);
        renderAreas(areas);
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        renderEmptyState();
    }
});

function renderTotals(stats) {
    document.getElementById('total-questoes').textContent = Number(stats.total_questoes_respondidas || 0);
    document.getElementById('total-listas').textContent = Number(stats.total_listas_finalizadas || 0);
}

function renderGeralChart(stats) {
    const canvas = document.getElementById('geral-chart');

    if (!canvas) {
        return;
    }

    const acertos = Number(stats.total_acertos || 0);
    const erros = Number(stats.total_erros || 0);

    new Chart(canvas, {
        type: 'pie',
        data: {
            labels: ['Acertos', 'Erros'],
            datasets: [{
                data: [acertos, erros],
                backgroundColor: ['#FFC6D0', '#F97D94'],
                borderWidth: 0,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                }
            }
        }
    });
}

function renderAreas(areas) {
    const container = document.getElementById('areas-container');

    if (!container) {
        return;
    }

    if (!Array.isArray(areas) || areas.length === 0) {
        renderEmptyState();
        return;
    }

    container.innerHTML = '';

    areas.forEach((area, index) => {
        const card = document.createElement('article');
        card.className = 'area-card';

        const title = area.disciplina_area?.descricao || 'Área sem nome';
        const feitos = Number(area.total_questoes_respondidas || 0);
        const acertos = Number(area.total_acertos || 0);
        const erros = Number(area.total_erros || 0);
        const aproveitamento = Number(area.aproveitamento_area || 0);

        const canvasId = `area-chart-${index}`;

        card.innerHTML = `
            <div>
                <div class="area-card__title">${title}</div>
                <div class="area-meta">Aproveitamento: ${formatPercent(aproveitamento)}</div>

                <div class="area-metrics">
                    <div class="area-metric">
                        <small>Questões feitas</small>
                        <strong>${feitos}</strong>
                    </div>
                    <div class="area-metric">
                        <small>Acertos</small>
                        <strong>${acertos}</strong>
                    </div>
                    <div class="area-metric">
                        <small>Erros</small>
                        <strong>${erros}</strong>
                    </div>
                </div>
            </div>

            <div class="area-chart-wrap">
                <canvas id="${canvasId}"></canvas>
            </div>
        `;

        container.appendChild(card);

        new Chart(document.getElementById(canvasId), {
            type: 'pie',
            data: {
                labels: ['Acertos', 'Erros'],
                datasets: [{
                    data: [acertos, erros],
                    backgroundColor: ['#ff8fb1', '#ffcad4'],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    }
                }
            }
        });
    });
}

function renderEmptyState() {
    const container = document.getElementById('areas-container');

    if (container) {
        container.innerHTML = '<div class="empty-state">Sem dados suficientes para exibir as estatísticas no momento.</div>';
    }
}

function formatPercent(value) {
    return `${Number(value || 0).toFixed(2).replace('.', ',')}%`;
}