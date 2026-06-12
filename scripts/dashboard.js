document.addEventListener("DOMContentLoaded", async () => {

    // =========================
    // MODO DESENVOLVIMENTO
    // =========================
    const DEV_MODE = true;

    let token = localStorage.getItem('jwt_token');

    // Se não tiver token e NÃO estiver em DEV
    if (!token && !DEV_MODE) {
        window.location.href = "login.html";
        return;
    }

    const API_BASE = 'http://localhost:3000/api';

    // Configuração do fetch
    const fetchOptions = {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    };

    try {

        // =========================
        // DADOS MOCKADOS (DESIGN)
        // =========================
        if (DEV_MODE) {

            populateProfile({
                login: "karen@email.com"
            });

            renderGeralChart({
                total_acertos: 75,
                total_erros: 25
            });

            renderDisciplinaChart([
                {
                    disciplina_area: {
                        descricao: "Matemática"
                    },
                    total_acertos: 40
                },
                {
                    disciplina_area: {
                        descricao: "Português"
                    },
                    total_acertos: 25
                },
                {
                    disciplina_area: {
                        descricao: "Biologia"
                    },
                    total_acertos: 10
                }
            ]);

            renderHeatmap([]);

            renderCalendar();

            return;
        }

        // =========================
        // API REAL
        // =========================
        const [profileRes, statsRes, areaRes, heatmapRes] = await Promise.all([
            fetch(`${API_BASE}/users/profile`, fetchOptions),
            fetch(`${API_BASE}/estatisticas/gerais`, fetchOptions),
            fetch(`${API_BASE}/estatisticas/por-area`, fetchOptions),
            fetch(`${API_BASE}/estatisticas/flashcards`, fetchOptions)
        ]);

        if (!profileRes.ok) {
            throw new Error('Falha na autenticação');
        }

        const profile = await profileRes.json();
        const stats = await statsRes.json();
        const areaStats = await areaRes.json();
        const heatmapData = await heatmapRes.json();

        // Renderização
        populateProfile(profile);
        renderGeralChart(stats);
        renderDisciplinaChart(areaStats);
        renderHeatmap(heatmapData);
        renderCalendar();

    } catch (error) {

        console.error("Erro ao carregar dashboard:", error);

        if (error.message === 'Falha na autenticação') {
            window.location.href = "login.html";
        }
    }
});

// ========================
// PERFIL
// ========================
function populateProfile(profile) {

    const nameEl = document.getElementById('profile-name');
    const imgEl = document.getElementById('profile-img');

    const dispName = profile.login.split('@')[0];

    nameEl.textContent =
        dispName.charAt(0).toUpperCase() + dispName.slice(1);

    imgEl.src =
        `https://ui-avatars.com/api/?name=${dispName}&background=random&color=fff`;
}

// ========================
// GRÁFICO GERAL
// ========================
function renderGeralChart(stats) {

    const ctx = document
        .getElementById('geralChart')
        .getContext('2d');

    const acertos = stats.total_acertos || 0;
    const erros = stats.total_erros || 0;

    if (acertos === 0 && erros === 0) {

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Sem Dados'],
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

    new Chart(ctx, {
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
// GRÁFICO DISCIPLINAS
// ========================
function renderDisciplinaChart(areaStats) {

    const ctx = document
        .getElementById('disciplinaChart')
        .getContext('2d');

    if (!areaStats || areaStats.length === 0) {

        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Vazio'],
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
        s => s.disciplina_area?.descricao || 'Desconhecido'
    );

    const dataAcertos = areaStats.map(
        s => s.total_acertos || 0
    );

    const checkZero =
        dataAcertos.reduce((acc, curr) => acc + curr, 0);

    if (checkZero === 0) {

        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Sem Dados'],
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

    const bgColors = labels.map(
        (_, i) => `hsl(${i * 45}, 70%, 50%)`
    );

    new Chart(ctx, {
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
// HEATMAP
// ========================
function renderHeatmap(heatmapData) {

    const container =
        document.getElementById('heatmap-container');

    const dataMap = {};

    if (Array.isArray(heatmapData)) {

        heatmapData.forEach(item => {

            dataMap[
                item.data_revisao.split('T')[0]
            ] = parseInt(item.cartoes_resolvidos, 10);
        });
    }

    const daysTotal = 180;

    const today = new Date();

    const startDate = new Date();

    startDate.setDate(
        today.getDate() - daysTotal + 1
    );

    const startDayOfWeek = startDate.getDay();

    startDate.setDate(
        startDate.getDate() - startDayOfWeek
    );

    const htmlFragments = [];

    let currentDate = new Date(startDate);

    while (currentDate <= today) {

        const isoStr =
            currentDate.toISOString().split('T')[0];

        const count = dataMap[isoStr] || 0;

        let levelClass = 'lvl-0';

        if (count > 0 && count < 5) {
            levelClass = 'lvl-1';
        }
        else if (count >= 5 && count < 10) {
            levelClass = 'lvl-2';
        }
        else if (count >= 10 && count < 20) {
            levelClass = 'lvl-3';
        }
        else if (count >= 20) {
            levelClass = 'lvl-4';
        }

        const titleStr =
            `${count} flashcards em ${isoStr}`;

        htmlFragments.push(`
            <div
                class="heatmap-cell ${levelClass}"
                title="${titleStr}">
            </div>
        `);

        currentDate.setDate(
            currentDate.getDate() + 1
        );
    }

    container.innerHTML = htmlFragments.join('');
}

// ========================
// CALENDÁRIO
// ========================
const calendarState = {
    currentDate: new Date()
};

function renderCalendar() {

    const grid =
        document.querySelector('.calendar-grid');

    const headerTitle =
        document.getElementById('calendar-month-year');

    const year =
        calendarState.currentDate.getFullYear();

    const month =
        calendarState.currentDate.getMonth();

    const monthNames = [
        "Janeiro",
        "Fevereiro",
        "Março",
        "Abril",
        "Maio",
        "Junho",
        "Julho",
        "Agosto",
        "Setembro",
        "Outubro",
        "Novembro",
        "Dezembro"
    ];

    headerTitle.textContent =
        `${monthNames[month]} ${year}`;

    const diasNode =
        grid.querySelectorAll('.calendar-day');

    diasNode.forEach(d => d.remove());

    const firstDay =
        new Date(year, month, 1).getDay();

    const daysInMonth =
        new Date(year, month + 1, 0).getDate();

    const daysInPrevMonth =
        new Date(year, month, 0).getDate();

    let htmlStr = '';

    // Dias do mês anterior
    for (let i = firstDay - 1; i >= 0; i--) {

        htmlStr += `
            <div class="calendar-day inactive">
                ${daysInPrevMonth - i}
            </div>
        `;
    }

    const todayDate = new Date();

    const eventosMocados = [3, 8, 15];
    const provasMocadas = [10, 20];

    // Dias atuais
    for (let day = 1; day <= daysInMonth; day++) {

        let classes = ['calendar-day'];

        if (
            day === todayDate.getDate() &&
            month === todayDate.getMonth() &&
            year === todayDate.getFullYear()
        ) {
            classes.push('today');
        }

        if (eventosMocados.includes(day)) {
            classes.push('calendar-marker-lista');
        }

        if (provasMocadas.includes(day)) {
            classes.push('calendar-marker-simulado');
        }

        htmlStr += `
            <div class="${classes.join(' ')}">
                ${day}
            </div>
        `;
    }

    // Próximo mês
    const totalSlots = firstDay + daysInMonth;

    let nextDim = 1;

    while (totalSlots + nextDim <= 42) {

        htmlStr += `
            <div class="calendar-day inactive">
                ${nextDim}
            </div>
        `;

        nextDim++;

        if (
            totalSlots + nextDim > 42 &&
            (totalSlots + nextDim - 1) % 7 === 0
        ) {
            break;
        }
    }

    grid.insertAdjacentHTML('beforeend', htmlStr);
}

// ========================
// BOTÕES CALENDÁRIO
// ========================
document
    .getElementById('prev-month')
    .addEventListener('click', () => {

        calendarState.currentDate.setMonth(
            calendarState.currentDate.getMonth() - 1
        );

        renderCalendar();
    });

document
    .getElementById('next-month')
    .addEventListener('click', () => {

        calendarState.currentDate.setMonth(
            calendarState.currentDate.getMonth() + 1
        );

        renderCalendar();
    });