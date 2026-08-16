document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://localhost:3000/api';
    const token = typeof obterToken === 'function' ? obterToken() : (localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token'));

    if (!token) {
        if (typeof redirecionarParaLogin === 'function') {
            redirecionarParaLogin('Sessão expirada. Faça login para acessar esta página.');
        } else {
            window.location.href = 'login.html';
        }
        return;
    }

    // Elementos DOM
    const containerQuestoes = document.getElementById('container-questoes-procurar');
    const badgeTotalQuestoes = document.getElementById('badge-total-questoes');
    const alertaFeedback = document.getElementById('alerta-feedback');
    const containerPaginacao = document.getElementById('container-paginacao');
    const formFiltros = document.getElementById('form-filtros');
    const selectDisciplina = document.getElementById('filtro-disciplina');
    const selectTema = document.getElementById('filtro-tema');
    const selectAno = document.getElementById('filtro-ano');
    const selectAutor = document.getElementById('filtro-autor');
    const selectStatus = document.getElementById('filtro-status');
    const inputBusca = document.getElementById('filtro-busca');
    const btnLimparFiltros = document.getElementById('btn-limpar-filtros');

    let disciplinasCache = [];
    let temasCache = [];
    let anosCache = [];
    let autoresCache = [];
    let paginaAtual = 1;

    function formatarUrlImagem(url) {
        if (!url || typeof url !== 'string') return '';
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
            return url;
        }
        return `http://localhost:3000${url.startsWith('/') ? url : '/' + url}`;
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function exibirAlerta(mensagem, tipo = 'alert-success') {
        if (!alertaFeedback) return;
        alertaFeedback.className = `alert ${tipo} alert-dismissible fade show shadow-sm`;
        alertaFeedback.innerHTML = `
            ${mensagem}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        alertaFeedback.classList.remove('d-none');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async function carregarFiltrosEAuxiliares() {
        try {
            const [respDisc, respTemas, respFiltros] = await Promise.all([
                fetch(`${API_BASE_URL}/disciplinas`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_BASE_URL}/temas`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_BASE_URL}/questoes/filtros`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            if (respDisc.ok) disciplinasCache = await respDisc.json();
            if (respTemas.ok) temasCache = await respTemas.json();
            if (respFiltros.ok) {
                const filtrosData = await respFiltros.json();
                anosCache = filtrosData.anos || [];
                autoresCache = filtrosData.autores || [];
            }

            preencherSelectDisciplinas();
            preencherSelectAnos();
            preencherSelectAutores();
            atualizarSelectTemas();

        } catch (err) {
            console.error('Erro ao carregar auxiliares dos filtros:', err);
        }
    }

    function preencherSelectDisciplinas() {
        if (!selectDisciplina) return;
        selectDisciplina.innerHTML = '<option value="">Todas as disciplinas</option>' +
            disciplinasCache.map(d => `<option value="${d.cod}">${escapeHtml(d.descricao || d.nome)}</option>`).join('');
    }

    function preencherSelectAnos() {
        if (!selectAno) return;
        selectAno.innerHTML = '<option value="">Todos os anos</option>' +
            anosCache.map(a => `<option value="${a}">${a}</option>`).join('');
    }

    function preencherSelectAutores() {
        if (!selectAutor) return;
        selectAutor.innerHTML = '<option value="">Todos os autores</option>' +
            autoresCache.map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join('');
    }

    function atualizarSelectTemas(disciplinaCod = '') {
        if (!selectTema) return;
        let temasFiltrados = temasCache;
        if (disciplinaCod) {
            temasFiltrados = temasCache.filter(t => String(t.disciplina_cod) === String(disciplinaCod));
        }

        selectTema.innerHTML = '<option value="">Todos os temas</option>' +
            temasFiltrados.map(t => `<option value="${t.cod}">${escapeHtml(t.descricao || t.nome)}</option>`).join('');
    }

    if (selectDisciplina) {
        selectDisciplina.addEventListener('change', (e) => {
            atualizarSelectTemas(e.target.value);
        });
    }

    async function buscarQuestoes(pagina = 1) {
        paginaAtual = pagina;
        if (containerQuestoes) {
            containerQuestoes.innerHTML = `
                <div class="text-center py-5 bg-white rounded shadow-sm border">
                    <div class="spinner-border text-verde mb-3" role="status"></div>
                    <p class="text-muted fw-semibold mb-0">Carregando questões do banco de dados...</p>
                </div>
            `;
        }

        const params = new URLSearchParams();
        params.append('pagina', pagina);
        params.append('limite', '10');

        if (selectDisciplina && selectDisciplina.value) params.append('disciplina_cod', selectDisciplina.value);
        if (selectTema && selectTema.value) params.append('tema_cod', selectTema.value);
        if (selectAno && selectAno.value) params.append('ano', selectAno.value);
        if (selectAutor && selectAutor.value) params.append('autor', selectAutor.value);
        if (selectStatus && selectStatus.value) params.append('status_resposta', selectStatus.value);
        if (inputBusca && inputBusca.value.trim()) params.append('busca', inputBusca.value.trim());

        try {
            const response = await fetch(`${API_BASE_URL}/questoes?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Falha ao buscar questões.');

            const data = await response.json();
            const questoes = data.questoes || [];

            if (badgeTotalQuestoes) {
                badgeTotalQuestoes.textContent = `${data.total || 0} questão(ões)`;
            }

            renderizarQuestoes(questoes);
            renderizarPaginacao(data.total, data.paginas, data.paginaAtual);

        } catch (err) {
            console.error('Erro ao buscar questões:', err);
            if (containerQuestoes) {
                containerQuestoes.innerHTML = `
                    <div class="alert alert-danger shadow-sm text-center py-4">
                        <i class="bi bi-exclamation-triangle-fill fs-3 d-block mb-2"></i>
                        Não foi possível carregar as questões. Tente novamente mais tarde.
                    </div>
                `;
            }
        }
    }

    function renderizarQuestoes(questoes) {
        if (!containerQuestoes) return;

        if (questoes.length === 0) {
            containerQuestoes.innerHTML = `
                <div class="text-center py-5 bg-white rounded shadow-sm border">
                    <i class="bi bi-inbox fs-1 text-muted d-block mb-2"></i>
                    <h5 class="fw-bold text-secondary mb-1">Nenhuma questão encontrada</h5>
                    <p class="text-muted small mb-0">Tente ajustar os filtros de busca para encontrar outras questões.</p>
                </div>
            `;
            return;
        }

        const letras = ['A', 'B', 'C', 'D', 'E'];

        containerQuestoes.innerHTML = questoes.map((q) => {
            const disciplinaNome = q.disciplina ? (q.disciplina.nome || q.disciplina.descricao) : 'Geral';
            const temaNome = q.tema ? (q.tema.nome || q.tema.descricao) : null;
            const jaRespondida = Boolean(q.ja_respondida);
            const respostaUsuario = q.resposta_usuario || null;

            const alternativasHtml = (q.alternativas || []).map((alt, index) => {
                const letra = letras[index] || (index + 1);
                let classeAlt = 'alternativa-item-interativa';
                
                if (jaRespondida && respostaUsuario) {
                    classeAlt += ' desabilitada';
                    if (alt.cod === respostaUsuario.alternativa_cod) {
                        classeAlt += respostaUsuario.correta ? ' correta' : ' incorreta';
                    } else if (alt.correta) {
                        classeAlt += ' correta';
                    }
                }

                return `
                    <div class="${classeAlt}" data-questao-cod="${q.cod}" data-alternativa-cod="${alt.cod}" id="alt-${q.cod}-${alt.cod}">
                        <div class="badge-letra">${letra}</div>
                        <div class="flex-grow-1">${escapeHtml(alt.texto)}</div>
                    </div>
                `;
            }).join('');

            const badgeStatusHtml = jaRespondida
                ? `<span class="badge badge-status-respondida me-2" id="badge-status-${q.cod}">
                    <i class="bi bi-check-circle-fill me-1"></i>Já Respondida
                   </span>`
                : `<span class="badge badge-status-inedita me-2" id="badge-status-${q.cod}">
                    <i class="bi bi-star-fill me-1"></i>Inédita
                   </span>`;

            const imgHtml = q.imagem_url ? `
                <div class="text-center my-3">
                    <img src="${formatarUrlImagem(q.imagem_url)}" class="img-fluid rounded border shadow-sm" style="max-height: 300px;" alt="Imagem da questão">
                </div>
            ` : '';

            const explicacaoVisivel = jaRespondida && q.explicacao;

            return `
                <div class="card card-questao-procurar bg-white shadow-sm border mb-4" id="card-questao-${q.cod}">
                    <div class="card-header questao-card-header p-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
                        <div class="d-flex align-items-center flex-wrap gap-2">
                            ${badgeStatusHtml}
                            <span class="badge bg-success me-1"><i class="bi bi-book me-1"></i>${escapeHtml(disciplinaNome)}</span>
                            ${temaNome ? `<span class="badge bg-primary me-1"><i class="bi bi-tag me-1"></i>${escapeHtml(temaNome)}</span>` : ''}
                            ${q.ano ? `<span class="badge bg-secondary me-1"><i class="bi bi-calendar me-1"></i>${q.ano}</span>` : ''}
                            ${q.autor ? `<span class="badge bg-info text-dark"><i class="bi bi-building me-1"></i>${escapeHtml(q.autor)}</span>` : ''}
                        </div>
                        <small class="text-muted fw-semibold">Código: #${q.cod}</small>
                    </div>
                    <div class="card-body p-4">
                        <div class="questao-enunciado fs-6 text-dark mb-3">
                            ${q.descricao}
                        </div>
                        ${imgHtml}
                        
                        <div class="alternativas-list mt-3">
                            ${alternativasHtml}
                        </div>

                        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-4 pt-3 border-top" id="footer-questao-${q.cod}">
                            <div>
                                ${jaRespondida ? `<small class="text-muted"><i class="bi bi-info-circle me-1"></i>Questões respondidas não alteram suas estatísticas globais.</small>` : ''}
                            </div>
                            <div class="d-flex gap-2">
                                <button type="button" class="btn btn-verde px-4 py-2 font-weight-bold shadow-sm ${jaRespondida ? 'd-none' : ''}" id="btn-responder-${q.cod}" data-questao-cod="${q.cod}">
                                    <i class="bi bi-check2-circle me-1"></i>Responder
                                </button>
                                ${q.explicacao ? `
                                    <button type="button" class="btn btn-outline-success px-3 py-2 font-weight-bold ${explicacaoVisivel ? '' : 'd-none'}" id="btn-explicacao-${q.cod}" data-questao-cod="${q.cod}">
                                        <i class="bi bi-lightbulb me-1"></i>Ver Explicação
                                    </button>
                                ` : ''}
                            </div>
                        </div>

                        <div class="box-explicacao d-none mt-3" id="box-explicacao-${q.cod}">
                            <h6 class="fw-bold text-success mb-2"><i class="bi bi-journal-check me-2"></i>Explicação / Gabarito Comentado</h6>
                            <p class="mb-0 text-dark small">${escapeHtml(q.explicacao)}</p>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        configurarInteratividadeQuestoes(questoes);
    }

    function configurarInteratividadeQuestoes(questoes) {
        questoes.forEach(q => {
            const cardEl = document.getElementById(`card-questao-${q.cod}`);
            if (!cardEl) return;

            let alternativaSelecionadaCod = null;
            const jaRespondida = Boolean(q.ja_respondida);

            if (!jaRespondida) {
                const itensAlt = cardEl.querySelectorAll('.alternativa-item-interativa');
                itensAlt.forEach(item => {
                    item.addEventListener('click', () => {
                        itensAlt.forEach(i => i.classList.remove('selecionada'));
                        item.classList.add('selecionada');
                        alternativaSelecionadaCod = item.getAttribute('data-alternativa-cod');
                    });
                });

                const btnResponder = document.getElementById(`btn-responder-${q.cod}`);
                if (btnResponder) {
                    btnResponder.addEventListener('click', async () => {
                        if (!alternativaSelecionadaCod) {
                            alert('Por favor, selecione uma alternativa antes de responder.');
                            return;
                        }
                        await responderQuestao(q.cod, alternativaSelecionadaCod, q);
                    });
                }
            }

            const btnExplicacao = document.getElementById(`btn-explicacao-${q.cod}`);
            const boxExplicacao = document.getElementById(`box-explicacao-${q.cod}`);

            if (btnExplicacao && boxExplicacao) {
                btnExplicacao.addEventListener('click', () => {
                    boxExplicacao.classList.toggle('d-none');
                });
            }
        });
    }

    async function responderQuestao(questaoCod, alternativaCod, questaoObj) {
        const btnResponder = document.getElementById(`btn-responder-${questaoCod}`);
        if (btnResponder) {
            btnResponder.disabled = true;
            btnResponder.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status"></span>Enviando...`;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/questoes/${questaoCod}/responder`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ alternativa_cod: alternativaCod })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao registrar resposta.');
            }

            // Atualiza o estado visual das alternativas do card
            const cardEl = document.getElementById(`card-questao-${questaoCod}`);
            if (cardEl) {
                const itensAlt = cardEl.querySelectorAll('.alternativa-item-interativa');
                itensAlt.forEach(item => {
                    item.classList.add('desabilitada');
                    const itemAltCod = parseInt(item.getAttribute('data-alternativa-cod'));

                    if (itemAltCod === parseInt(alternativaCod)) {
                        item.classList.add(data.correta ? 'correta' : 'incorreta');
                    } else if (itemAltCod === parseInt(data.alternativa_correta_cod)) {
                        item.classList.add('correta');
                    }
                });

                // Atualiza a badge para Já Respondida
                const badgeStatus = document.getElementById(`badge-status-${questaoCod}`);
                if (badgeStatus) {
                    badgeStatus.className = 'badge badge-status-respondida me-2';
                    badgeStatus.innerHTML = `<i class="bi bi-check-circle-fill me-1"></i>Já Respondida`;
                }

                // Oculta o botão responder
                if (btnResponder) btnResponder.classList.add('d-none');

                // Exibe botão e caixa de explicação se houver
                const btnExplicacao = document.getElementById(`btn-explicacao-${questaoCod}`);
                if (btnExplicacao && data.explicacao) {
                    btnExplicacao.classList.remove('d-none');
                }

                // Adiciona o aviso de estatísticas no footer do card
                const footerEl = document.getElementById(`footer-questao-${questaoCod}`);
                if (footerEl) {
                    const infoDiv = footerEl.querySelector('div');
                    if (infoDiv) {
                        infoDiv.innerHTML = `<small class="text-muted"><i class="bi bi-info-circle me-1"></i>Questões respondidas não alteram suas estatísticas globais.</small>`;
                    }
                }
            }

        } catch (err) {
            console.error('Erro ao submeter resposta:', err);
            alert(err.message || 'Ocorreu um erro ao enviar sua resposta.');
            if (btnResponder) {
                btnResponder.disabled = false;
                btnResponder.innerHTML = `<i class="bi bi-check2-circle me-1"></i>Responder`;
            }
        }
    }

    function renderizarPaginacao(totalItems, totalPaginas, paginaCorrente) {
        if (!containerPaginacao) return;

        if (!totalPaginas || totalPaginas <= 1) {
            containerPaginacao.innerHTML = '';
            return;
        }

        let html = '';

        // Botão Anterior
        const disabledPrev = paginaCorrente === 1 ? 'disabled' : '';
        html += `<a href="#" class="page-link-custom ${disabledPrev}" data-page="${paginaCorrente - 1}">&laquo; Anterior</a>`;

        // Páginas
        for (let i = 1; i <= totalPaginas; i++) {
            if (i === 1 || i === totalPaginas || (i >= paginaCorrente - 2 && i <= paginaCorrente + 2)) {
                const activeClass = i === paginaCorrente ? 'active' : '';
                html += `<a href="#" class="page-link-custom ${activeClass}" data-page="${i}">${i}</a>`;
            } else if (i === paginaCorrente - 3 || i === paginaCorrente + 3) {
                html += `<span class="px-1 text-muted">...</span>`;
            }
        }

        // Botão Próximo
        const disabledNext = paginaCorrente === totalPaginas ? 'disabled' : '';
        html += `<a href="#" class="page-link-custom ${disabledNext}" data-page="${paginaCorrente + 1}">Próximo &raquo;</a>`;

        containerPaginacao.innerHTML = html;

        containerPaginacao.querySelectorAll('a.page-link-custom').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const p = parseInt(btn.getAttribute('data-page'));
                if (p && p !== paginaCorrente && p >= 1 && p <= totalPaginas) {
                    buscarQuestoes(p);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });
    }

    // Handlers de formulário de filtros
    if (formFiltros) {
        formFiltros.addEventListener('submit', (e) => {
            e.preventDefault();
            buscarQuestoes(1);
        });
    }

    if (btnLimparFiltros) {
        btnLimparFiltros.addEventListener('click', () => {
            if (selectDisciplina) selectDisciplina.value = '';
            if (selectTema) selectTema.value = '';
            if (selectAno) selectAno.value = '';
            if (selectAutor) selectAutor.value = '';
            if (selectStatus) selectStatus.value = '';
            if (inputBusca) inputBusca.value = '';

            atualizarSelectTemas();
            buscarQuestoes(1);
        });
    }

    // Inicialização da página
    carregarFiltrosEAuxiliares();
    buscarQuestoes(1);
});
