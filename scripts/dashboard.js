document.addEventListener("DOMContentLoaded", async () => {

    const token = typeof obterToken === 'function' ? obterToken() : (localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token'));

    if (!token) {
        if (typeof redirecionarParaLogin === 'function') {
            redirecionarParaLogin("Acesso negado. Faça login para acessar o dashboard.");
        } else {
            window.location.href = "login.html";
        }
        return;
    }

    const API_BASE = 'http://localhost:3000/api';

    const fetchOptions = {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    };

    try {
        // =========================
        // BUSCA DE DADOS REAIS DA API
        // =========================
        const [profileRes, statsRes, areaRes, heatmapRes, calRes] = await Promise.all([
            fetch(`${API_BASE}/users/profile`, fetchOptions),
            fetch(`${API_BASE}/estatisticas/gerais`, fetchOptions),
            fetch(`${API_BASE}/estatisticas/por-area`, fetchOptions),
            fetch(`${API_BASE}/estatisticas/flashcards`, fetchOptions),
            fetch(`${API_BASE}/estatisticas/atividades-calendario`, fetchOptions)
        ]);

        if (!profileRes.ok) {
            if (typeof tratarRespostaNaoAutorizada === 'function' && tratarRespostaNaoAutorizada(profileRes)) {
                return;
            }
            throw new Error('Falha na autenticação');
        }

        const profile = await profileRes.json();
        const stats = statsRes.ok ? await statsRes.json() : {};
        const areaStats = areaRes.ok ? await areaRes.json() : [];
        const heatmapData = heatmapRes.ok ? await heatmapRes.json() : [];
        const atividadesData = calRes.ok ? await calRes.json() : [];

        // Atualizar estado global de atividades do calendário
        calendarState.atividades = atividadesData;

        // Renderização da interface
        populateProfile(profile);
        renderGeralChart(stats);
        renderDisciplinaChart(areaStats);
        renderHeatmap(heatmapData);
        renderCalendar();

    } catch (error) {
        console.error("Erro ao carregar dashboard:", error);

        if (error.message === 'Falha na autenticação') {
            if (typeof redirecionarParaLogin === 'function') {
                redirecionarParaLogin("Sessão expirada.");
            } else {
                window.location.href = "login.html";
            }
        }
    }
});

// ========================
// PERFIL DO USUÁRIO
// ========================
function populateProfile(profile) {
    const nameEl = document.getElementById('profile-name');
    const imgEl = document.getElementById('profile-img');
    const roleEl = document.getElementById('profile-role');

    // Prioriza o nome completo real do usuário, utilizando fallback do e-mail
    const dispName = profile.nomeCompleto || (profile.login ? profile.login.split('@')[0] : 'Usuário');

    if (nameEl) {
        nameEl.textContent = dispName;
    }

    if (roleEl) {
        roleEl.textContent = profile.adm ? 'Administrador' : 'Estudante';
    }

    if (imgEl) {
        imgEl.onerror = () => {
            const avatarName = encodeURIComponent(dispName);
            imgEl.src = `https://ui-avatars.com/api/?name=${avatarName}&background=0d6efd&color=fff`;
        };

        if (profile.foto) {
            imgEl.src = profile.foto.startsWith('http')
                ? profile.foto
                : `http://localhost:3000${profile.foto.startsWith('/') ? '' : '/'}${profile.foto}`;
        } else {
            const avatarName = encodeURIComponent(dispName);
            imgEl.src = `https://ui-avatars.com/api/?name=${avatarName}&background=0d6efd&color=fff`;
        }
    }
}

// Global Chart instances para destruição limpa e re-renderização
let geralChartInstance = null;
let disciplinaChartInstance = null;

// ========================
// GRÁFICO GERAL DE ACERTOS
// ========================
function renderGeralChart(stats) {
    const canvas = document.getElementById('geralChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (geralChartInstance) {
        geralChartInstance.destroy();
    }

    const acertos = Number(stats.total_acertos) || 0;
    const erros = Number(stats.total_erros) || 0;

    if (acertos === 0 && erros === 0) {
        geralChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Nenhuma questão respondida'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['#e0e0e0']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
        return;
    }

    geralChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Acertos', 'Erros'],
            datasets: [{
                data: [acertos, erros],
                backgroundColor: ['#39d353', '#dc3545'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// ========================
// GRÁFICO ACERTOS POR DISCIPLINA
// ========================
function renderDisciplinaChart(areaStats) {
    const canvas = document.getElementById('disciplinaChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (disciplinaChartInstance) {
        disciplinaChartInstance.destroy();
    }

    if (!areaStats || areaStats.length === 0) {
        disciplinaChartInstance = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Sem dados'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['#e0e0e0']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
        return;
    }

    const labels = areaStats.map(
        s => s.disciplina_area?.descricao || 'Outros'
    );

    const dataAcertos = areaStats.map(
        s => Number(s.total_acertos) || 0
    );

    const checkZero = dataAcertos.reduce((acc, curr) => acc + curr, 0);

    if (checkZero === 0) {
        disciplinaChartInstance = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Sem dados de acertos'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['#e0e0e0']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
        return;
    }

    // Cores vibrantes e consistentes para disciplinas
    const palette = [
        '#0d6efd', '#198754', '#ffc107', '#0dcaf0',
        '#6f42c1', '#d63384', '#fd7e14', '#20c997'
    ];
    const bgColors = labels.map((_, i) => palette[i % palette.length]);

    disciplinaChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: dataAcertos,
                backgroundColor: bgColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// ========================
// HEATMAP FLASHCARDS
// ========================
function renderHeatmap(heatmapData) {
    const container = document.getElementById('heatmap-container');
    if (!container) return;

    const dataMap = {};

    if (Array.isArray(heatmapData)) {
        heatmapData.forEach(item => {
            if (item.data_revisao) {
                const dateKey = String(item.data_revisao).split('T')[0];
                dataMap[dateKey] = (dataMap[dateKey] || 0) + parseInt(item.cartoes_resolvidos || 0, 10);
            }
        });
    }

    const daysTotal = 180;
    const today = new Date();

    const startDate = new Date();
    startDate.setDate(today.getDate() - daysTotal + 1);

    const startDayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - startDayOfWeek);

    const htmlFragments = [];
    let currentDate = new Date(startDate);

    while (currentDate <= today) {
        const isoStr = currentDate.toISOString().split('T')[0];
        const count = dataMap[isoStr] || 0;

        let levelClass = 'lvl-0';
        if (count > 0 && count < 5) {
            levelClass = 'lvl-1';
        } else if (count >= 5 && count < 10) {
            levelClass = 'lvl-2';
        } else if (count >= 10 && count < 20) {
            levelClass = 'lvl-3';
        } else if (count >= 20) {
            levelClass = 'lvl-4';
        }

        const titleStr = `${count} flashcard(s) revisado(s) em ${isoStr}`;

        htmlFragments.push(`
            <div class="heatmap-cell ${levelClass}" title="${titleStr}"></div>
        `);

        currentDate.setDate(currentDate.getDate() + 1);
    }

    container.innerHTML = htmlFragments.join('');
}

// ========================
// CALENDÁRIO COM DADOS REAIS
// ========================
const calendarState = {
    currentDate: new Date(),
    atividades: []
};

function renderCalendar() {
    const grid = document.querySelector('.calendar-grid');
    const headerTitle = document.getElementById('calendar-month-year');
    if (!grid || !headerTitle) return;

    const year = calendarState.currentDate.getFullYear();
    const month = calendarState.currentDate.getMonth();

    const monthNames = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    headerTitle.textContent = `${monthNames[month]} ${year}`;

    const diasNode = grid.querySelectorAll('.calendar-day');
    diasNode.forEach(d => d.remove());

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    let htmlStr = '';

    // Dias do mês anterior
    for (let i = firstDay - 1; i >= 0; i--) {
        htmlStr += `<div class="calendar-day inactive">${daysInPrevMonth - i}</div>`;
    }

    const todayDate = new Date();

    // Mapeia atividades reais do usuário para o mês e ano atual
    const atividadesPorDia = {};
    if (Array.isArray(calendarState.atividades)) {
        calendarState.atividades.forEach(item => {
            if (item.data_finalizacao) {
                const dateObj = new Date(item.data_finalizacao);
                if (dateObj.getFullYear() === year && dateObj.getMonth() === month) {
                    const dayNum = dateObj.getDate();
                    if (!atividadesPorDia[dayNum]) {
                        atividadesPorDia[dayNum] = [];
                    }
                    atividadesPorDia[dayNum].push(item);
                }
            }
        });
    }

    // Dias do mês atual
    for (let day = 1; day <= daysInMonth; day++) {
        let classes = ['calendar-day'];
        let titles = [];

        if (
            day === todayDate.getDate() &&
            month === todayDate.getMonth() &&
            year === todayDate.getFullYear()
        ) {
            classes.push('today');
        }

        const atividadesDoDia = atividadesPorDia[day] || [];
        const temLista = atividadesDoDia.some(a => a.atividade?.tipo === 'lista');
        const temSimulado = atividadesDoDia.some(a => a.atividade?.tipo === 'simulado');

        if (temLista) {
            classes.push('calendar-marker-lista');
        }
        if (temSimulado) {
            classes.push('calendar-marker-simulado');
        }

        if (atividadesDoDia.length > 0) {
            const resumos = atividadesDoDia.map(a => `${a.atividade?.tipo === 'simulado' ? 'Simulado' : 'Lista'}: ${a.atividade?.nome || 'Atividade'}`);
            titles.push(resumos.join(' | '));
        }

        const titleAttr = titles.length > 0 ? `title="${titles.join(' \n')}"` : '';

        htmlStr += `<div class="${classes.join(' ')}" ${titleAttr}>${day}</div>`;
    }

    // Dias do próximo mês para completar o grid (42 células = 6 semanas x 7 dias)
    const totalSlots = firstDay + daysInMonth;
    let nextDim = 1;

    while (totalSlots + nextDim <= 42) {
        htmlStr += `<div class="calendar-day inactive">${nextDim}</div>`;
        nextDim++;
        if (totalSlots + nextDim > 42 && (totalSlots + nextDim - 1) % 7 === 0) {
            break;
        }
    }

    grid.insertAdjacentHTML('beforeend', htmlStr);
}

// ========================
// NAVEGAÇÃO DO CALENDÁRIO
// ========================
document.getElementById('prev-month')?.addEventListener('click', () => {
    calendarState.currentDate.setMonth(calendarState.currentDate.getMonth() - 1);
    renderCalendar();
});

document.getElementById('next-month')?.addEventListener('click', () => {
    calendarState.currentDate.setMonth(calendarState.currentDate.getMonth() + 1);
    renderCalendar();
});