document.addEventListener('DOMContentLoaded', async () => {
  // Configuração da URL Base da API backend
  const API_URL = 'http://localhost:3000/api';

  // Chave de autenticação armazenada conforme regras do GEMINI.md
  const token = localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token');

  // Elementos do DOM
  const dataHojeSpan = document.getElementById('dashboard-data-texto');
  const greetingHeader = document.getElementById('admin-nome-greeting');
  const reportadasBadge = document.getElementById('reportadas-badge');
  const reportadasContainer = document.getElementById('reportadas-container');
  const ultimasQuestoesContainer = document.getElementById('ultimas-questoes-container');
  const btnAdicionarQuestao = document.getElementById('btn-adicionar-questao');
  const canvasGrafico = document.getElementById('graficoDisciplinas');

  // Instância do gráfico do Chart.js
  let meuGraficoDisciplinas = null;

  // 1. Atualização da data atual no formato abreviado em português (ex: "08 Ago 2026")
  function atualizarDataAtual() {
    if (!dataHojeSpan) return;
    const agora = new Date();
    const dia = String(agora.getDate()).padStart(2, '0');
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const mes = meses[agora.getMonth()];
    const ano = agora.getFullYear();
    dataHojeSpan.textContent = `${dia} ${mes} ${ano}`;
  }

  // 2. Personalização do cumprimento ao Administrador
  function atualizarCumprimento() {
    if (!greetingHeader) return;
    try {
      const usuarioSalvo = localStorage.getItem('usuario') || sessionStorage.getItem('usuario');
      if (usuarioSalvo) {
        const usuarioObj = JSON.parse(usuarioSalvo);
        const primeiroNome = usuarioObj.nome_completo ? usuarioObj.nome_completo.split(' ')[0] : (usuarioObj.login || 'Administrador');
        greetingHeader.textContent = `Olá, ${primeiroNome}`;
      }
    } catch (e) {
      console.warn('Não foi possível ler os dados do usuário para a saudação:', e);
    }
  }

  // 3. Formatação relativa de data para as últimas questões (ex: "Hoje", "Ontem", "X dias")
  function formatarDataRelativa(dataString) {
    if (!dataString) return 'Recente';
    const dataCriacao = new Date(dataString);
    const hoje = new Date();
    
    // Zera horas para comparar apenas os dias
    dataCriacao.setHours(0, 0, 0, 0);
    hoje.setHours(0, 0, 0, 0);

    const diffTempo = Math.abs(hoje - dataCriacao);
    const diffDias = Math.ceil(diffTempo / (1000 * 60 * 60 * 24));

    if (diffDias === 0) return 'Hoje';
    if (diffDias === 1) return 'Ontem';
    if (diffDias < 7) return `${diffDias} dias`;
    return dataCriacao.toLocaleDateString('pt-BR');
  }

  // 4. Ação do Botão Adicionar Questão
  if (btnAdicionarQuestao) {
    btnAdicionarQuestao.addEventListener('click', () => {
      window.location.href = 'adicionarQuestao.html';
    });
  }

  // 5. Função principal para buscar os dados do dashboard na API
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
        if (response.status === 401 || response.status === 403) {
          console.error('Acesso não autorizado ao carregar dados do dashboard.');
        }
        throw new Error('Falha ao carregar estatísticas do dashboard.');
      }

      const dados = await response.json();

      renderizarReportes(dados.totalReportesPendentes, dados.questoesReportadas);
      renderizarUltimasQuestoes(dados.ultimasQuestoes);
      renderizarGrafico(dados.disciplinasMaisEstudadas);

    } catch (error) {
      console.error('Erro ao carregar dashboard admin:', error);
    }
  }

  // 6. Renderização das Questões Reportadas Pendentes
  function renderizarReportes(total, reportes) {
    if (reportadasBadge) {
      reportadasBadge.textContent = total || 0;
      if (total === 0) {
        reportadasBadge.className = 'badge rounded-pill text-bg-secondary';
      } else {
        reportadasBadge.className = 'badge rounded-pill text-bg-danger';
      }
    }

    if (!reportadasContainer) return;
    reportadasContainer.innerHTML = '';

    if (!reportes || reportes.length === 0) {
      reportadasContainer.innerHTML = `
        <div class="text-center py-4 text-muted">
          <i class="bi bi-check-circle fs-3 d-block mb-2 text-success"></i>
          <p class="mb-0">Nenhuma questão reportada pendente!</p>
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
          <p><strong>${rep.disciplina}</strong></p>
          <small>${rep.motivo}${rep.descricao_detalhada ? `: ${rep.descricao_detalhada}` : ''}</small>
        </div>
        <button class="btn btn-rosa btn-sm btn-resolver-reporte" data-cod="${rep.cod}">
          Resolver
        </button>
      `;

      divItem.querySelector('.btn-resolver-reporte').addEventListener('click', () => {
        window.location.href = `questoesReportadas.html?questaoCod=${rep.cod}`;
      });

      reportadasContainer.appendChild(divItem);
    });
  }

  // 7. Renderização das Últimas Questões Cadastradas
  function renderizarUltimasQuestoes(questoes) {
    if (!ultimasQuestoesContainer) return;
    ultimasQuestoesContainer.innerHTML = '';

    if (!questoes || questoes.length === 0) {
      ultimasQuestoesContainer.innerHTML = `
        <div class="text-center py-4 text-muted">
          <p class="mb-0">Nenhuma questão cadastrada recentemente.</p>
        </div>
      `;
      return;
    }

    questoes.forEach(q => {
      const liItem = document.createElement('li');
      liItem.innerHTML = `
        <div>
          <strong>${q.disciplina}</strong>
          <span>${q.tema}</span>
        </div>
        <small>${formatarDataRelativa(q.data)}</small>
      `;
      ultimasQuestoesContainer.appendChild(liItem);
    });
  }

  // 8. Renderização do Gráfico com Chart.js
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

    // Cores modernas alinhadas à paleta Cedeefe
    const coresBarras = [
      '#e83e8c', // Rosa forte
      '#20c997', // Verde menta
      '#6f42c1', // Roxo
      '#fd7e14', // Laranja
      '#0dcaf5', // Ciano
      '#ffc107', // Amarelo
      '#198754'  // Verde
    ];

    if (meuGraficoDisciplinas) {
      meuGraficoDisciplinas.destroy();
    }

    const ctx = canvasGrafico.getContext('2d');
    meuGraficoDisciplinas = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          data: valores,
          backgroundColor: coresBarras.slice(0, labels.length),
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return ` ${context.raw} resoluções/questões`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0
            }
          }
        }
      }
    });
  }

  // Inicialização das funções
  atualizarDataAtual();
  atualizarCumprimento();
  await carregarDadosDashboard();
});
