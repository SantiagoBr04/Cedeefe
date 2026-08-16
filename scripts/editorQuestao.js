/**
 * Componente Reutilizável de Editor de Texto Enriquecido (Rich Text Editor) para o Cedeefe.
 * Suporta formatação essencial (Negrito, Itálico, Sublinhado, Subscrito, Sobrescrito),
 * estado ativo de botões, inserção de imagens e símbolos matemáticos.
 */
class EditorQuestao {
    /**
     * @param {HTMLElement|string} container - Elemento HTML ou seletor onde o editor será renderizado
     * @param {Object} options - Configurações opcionais
     */
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        if (!this.container) {
            console.error('[EditorQuestao] Container não encontrado:', container);
            return;
        }

        this.options = Object.assign({
            placeholder: 'Digite seu texto aqui...',
            compact: false,
            initialValue: '',
            onContentChange: null
        }, options);

        this.idUnico = `editor-${Math.random().toString(36).substring(2, 9)}`;
        this.inicializar();
    }

    inicializar() {
        this.container.classList.add('editor-questao-container');
        if (this.options.compact) {
            this.container.classList.add('editor-compact');
        }

        this.imagemSelecionada = null;
        this.toolbarImagemEl = null;

        const toolbarButtonsHtml = this.options.compact ? this.renderizarToolbarCompacta() : this.renderizarToolbarCompleta();

        this.container.innerHTML = `
            <div class="editor-toolbar" id="toolbar-${this.idUnico}">
                ${toolbarButtonsHtml}
            </div>
            <div class="editor-contentarea" id="area-${this.idUnico}" contenteditable="true" placeholder="${this.escapeAttribute(this.options.placeholder)}"></div>
        `;

        this.toolbarEl = this.container.querySelector('.editor-toolbar');
        this.editorEl = this.container.querySelector('.editor-contentarea');

        if (this.options.initialValue) {
            this.definirHtml(this.options.initialValue);
        }

        this.vincularEventos();
    }

    renderizarToolbarCompleta() {
        return `
            <button type="button" class="btn-fmt btn-bold" data-cmd="bold" title="Negrito (Ctrl+B)"><i class="bi bi-type-bold"></i></button>
            <button type="button" class="btn-fmt btn-italic" data-cmd="italic" title="Itálico (Ctrl+I)"><i class="bi bi-type-italic"></i></button>
            <button type="button" class="btn-fmt btn-underline" data-cmd="underline" title="Sublinhado (Ctrl+U)"><i class="bi bi-type-underline"></i></button>
            
            <div class="separator"></div>

            <button type="button" class="btn-fmt btn-subscript" data-cmd="subscript" title="Subscrito (embaixo)">H<sub>2</sub>O</button>
            <button type="button" class="btn-fmt btn-superscript" data-cmd="superscript" title="Sobrescrito (em cima)">X<sup>2</sup></button>

            <div class="separator"></div>

            <div class="dropdown d-inline-block editor-symbols-dropdown">
                <button type="button" class="btn-fmt dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false" title="Símbolos Matemáticos">
                    <i class="bi bi-calculator me-1"></i> Símbolos
                </button>
                <div class="dropdown-menu p-2 shadow">
                    <div class="editor-symbols-grid">
                        <button type="button" class="btn-simbolo" data-simbolo="√">√</button>
                        <button type="button" class="btn-simbolo" data-simbolo="π">π</button>
                        <button type="button" class="btn-simbolo" data-simbolo="α">α</button>
                        <button type="button" class="btn-simbolo" data-simbolo="β">β</button>
                        <button type="button" class="btn-simbolo" data-simbolo="Δ">Δ</button>
                        <button type="button" class="btn-simbolo" data-simbolo="°">°</button>
                        <button type="button" class="btn-simbolo" data-simbolo="±">±</button>
                        <button type="button" class="btn-simbolo" data-simbolo="≤">≤</button>
                        <button type="button" class="btn-simbolo" data-simbolo="≥">≥</button>
                        <button type="button" class="btn-simbolo" data-simbolo="∞">∞</button>
                        <button type="button" class="btn-simbolo" data-simbolo="→">→</button>
                        <button type="button" class="btn-simbolo" data-simbolo="⇒">⇒</button>
                        <button type="button" class="btn-simbolo" data-simbolo="≠">≠</button>
                        <button type="button" class="btn-simbolo" data-simbolo="×">×</button>
                        <button type="button" class="btn-simbolo" data-simbolo="÷">÷</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderizarToolbarCompacta() {
        return `
            <button type="button" class="btn-fmt btn-bold" data-cmd="bold" title="Negrito"><i class="bi bi-type-bold"></i></button>
            <button type="button" class="btn-fmt btn-italic" data-cmd="italic" title="Itálico"><i class="bi bi-type-italic"></i></button>
            <button type="button" class="btn-fmt btn-underline" data-cmd="underline" title="Sublinhado"><i class="bi bi-type-underline"></i></button>
            <button type="button" class="btn-fmt btn-subscript" data-cmd="subscript" title="Subscrito">H<sub>2</sub>O</button>
            <button type="button" class="btn-fmt btn-superscript" data-cmd="superscript" title="Sobrescrito">X<sup>2</sup></button>
        `;
    }

    vincularEventos() {
        const atualizarAtivos = () => this.atualizarEstadoBotoes();

        this.editorEl.addEventListener('keyup', atualizarAtivos);
        this.editorEl.addEventListener('mouseup', atualizarAtivos);
        this.editorEl.addEventListener('focus', atualizarAtivos);

        this.editorEl.addEventListener('click', (e) => {
            atualizarAtivos();
            if (e.target && e.target.tagName === 'IMG') {
                this.selecionarImagem(e.target);
            } else {
                this.desselecionarImagem();
            }
        });

        document.addEventListener('click', (e) => {
            if (this.imagemSelecionada && !this.container.contains(e.target) && (!this.toolbarImagemEl || !this.toolbarImagemEl.contains(e.target))) {
                this.desselecionarImagem();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.imagemSelecionada) {
                this.desselecionarImagem();
            }
        });

        document.addEventListener('selectionchange', () => {
            if (document.activeElement === this.editorEl) {
                atualizarAtivos();
            }
        });

        this.toolbarEl.querySelectorAll('[data-cmd]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const cmd = btn.dataset.cmd;
                this.alternarComandoFormatacao(cmd);
            });
        });

        this.toolbarEl.querySelectorAll('.btn-simbolo').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const simbolo = btn.dataset.simbolo;
                this.inserirTextoSimples(simbolo);
            });
        });

        if (typeof this.options.onContentChange === 'function') {
            this.editorEl.addEventListener('input', () => {
                this.options.onContentChange(this.obterHtml());
            });
        }
    }

    selecionarImagem(imgEl) {
        if (this.imagemSelecionada === imgEl) {
            this.posicionarToolbarImagem();
            return;
        }

        this.desselecionarImagem();
        this.imagemSelecionada = imgEl;
        this.imagemSelecionada.classList.add('img-selected');
        this.criarToolbarImagem();
    }

    desselecionarImagem() {
        if (this.imagemSelecionada) {
            this.imagemSelecionada.classList.remove('img-selected');
            this.imagemSelecionada = null;
        }
        if (this.toolbarImagemEl) {
            this.toolbarImagemEl.remove();
            this.toolbarImagemEl = null;
        }
    }

    criarToolbarImagem() {
        if (this.toolbarImagemEl) {
            this.toolbarImagemEl.remove();
        }

        const toolbar = document.createElement('div');
        toolbar.className = 'editor-img-toolbar shadow-sm border rounded';
        
        // Define o percentual atual da imagem para marcar o botão ativo
        const widthAtual = this.imagemSelecionada.style.width || '100%';

        toolbar.innerHTML = `
            <span class="toolbar-label me-1"><i class="bi bi-aspect-ratio text-success me-1"></i> Tamanho:</span>
            <button type="button" class="btn-img-size ${widthAtual === '10%' ? 'is-active' : ''}" data-size="10%">10%</button>
            <button type="button" class="btn-img-size ${widthAtual === '25%' ? 'is-active' : ''}" data-size="25%">25%</button>
            <button type="button" class="btn-img-size ${widthAtual === '50%' ? 'is-active' : ''}" data-size="50%">50%</button>
            <button type="button" class="btn-img-size ${widthAtual === '75%' ? 'is-active' : ''}" data-size="75%">75%</button>
            <button type="button" class="btn-img-size ${widthAtual === '100%' ? 'is-active' : ''}" data-size="100%">100%</button>
            <div class="separator-v"></div>
            <button type="button" class="btn-img-delete text-danger ms-1" title="Excluir Imagem"><i class="bi bi-trash3-fill"></i></button>
        `;

        this.container.appendChild(toolbar);
        this.toolbarImagemEl = toolbar;

        // Eventos dos botões de tamanho
        toolbar.querySelectorAll('.btn-img-size').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!this.imagemSelecionada) return;

                const novoTamanho = btn.dataset.size;
                this.imagemSelecionada.style.width = novoTamanho;
                this.imagemSelecionada.style.maxWidth = '100%';
                this.imagemSelecionada.style.height = 'auto';

                // Atualiza classe ativa dos botões
                toolbar.querySelectorAll('.btn-img-size').forEach(b => b.classList.remove('is-active'));
                btn.classList.add('is-active');

                this.posicionarToolbarImagem();

                if (typeof this.options.onContentChange === 'function') {
                    this.options.onContentChange(this.obterHtml());
                }
            });
        });

        // Evento de exclusão de imagem
        const btnDelete = toolbar.querySelector('.btn-img-delete');
        if (btnDelete) {
            btnDelete.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.imagemSelecionada) {
                    this.imagemSelecionada.remove();
                    this.desselecionarImagem();

                    if (typeof this.options.onContentChange === 'function') {
                        this.options.onContentChange(this.obterHtml());
                    }
                }
            });
        }

        this.posicionarToolbarImagem();
    }

    posicionarToolbarImagem() {
        if (!this.toolbarImagemEl || !this.imagemSelecionada || !this.container) return;

        const containerRect = this.container.getBoundingClientRect();
        const imgRect = this.imagemSelecionada.getBoundingClientRect();

        // Calcula a posição no eixo Y em relação ao container do editor
        let top = (imgRect.top - containerRect.top) - 44;
        if (top < 38) {
            top = (imgRect.bottom - containerRect.top) + 6;
        }

        // Centraliza horizontalmente sobre a imagem
        let left = (imgRect.left - containerRect.left) + (imgRect.width / 2) - (this.toolbarImagemEl.offsetWidth / 2);
        left = Math.max(8, Math.min(left, containerRect.width - this.toolbarImagemEl.offsetWidth - 8));

        this.toolbarImagemEl.style.top = `${top}px`;
        this.toolbarImagemEl.style.left = `${left}px`;
    }

    alternarComandoFormatacao(command) {
        this.editorEl.focus();

        if (command === 'subscript' || command === 'superscript' || command === 'underline') {
            const tagAlvo = command === 'subscript' ? 'SUB' : (command === 'superscript' ? 'SUP' : 'U');
            const nodeAtual = this.obterNoDaSelecao();

            if (nodeAtual && (this.temAncestralTag(nodeAtual, tagAlvo) || (command === 'underline' && this.temAncestralEstilo(nodeAtual, 'textDecoration', 'underline')))) {
                this.sairDeTagFormatacao(tagAlvo);
            } else {
                document.execCommand(command, false, null);
            }
        } else {
            document.execCommand(command, false, null);
        }

        this.atualizarEstadoBotoes();
    }

    sairDeTagFormatacao(tagName) {
        const sel = window.getSelection();
        if (!sel.rangeCount) return;

        let node = sel.getRangeAt(0).startContainer;
        while (node && node !== this.editorEl) {
            const isMatchTag = node.nodeName === tagName || (tagName === 'U' && (node.nodeName === 'U' || (node.style && node.style.textDecoration && node.style.textDecoration.includes('underline'))));
            if (isMatchTag) {
                const espacoTexto = document.createTextNode('\u200B');
                if (node.nextSibling) {
                    node.parentNode.insertBefore(espacoTexto, node.nextSibling);
                } else {
                    node.parentNode.appendChild(espacoTexto);
                }

                if (tagName === 'SUB') document.execCommand('subscript', false, null);
                else if (tagName === 'SUP') document.execCommand('superscript', false, null);
                else if (tagName === 'U') document.execCommand('underline', false, null);

                const range = document.createRange();
                range.setStartAfter(espacoTexto);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
                break;
            }
            node = node.parentNode;
        }
    }

    atualizarEstadoBotoes() {
        const noAtual = this.obterNoDaSelecao();
        if (!noAtual) return;

        const isBold = document.queryCommandState('bold') || this.temAncestralTag(noAtual, ['B', 'STRONG']);
        this.setButtonActive('bold', isBold);

        const isItalic = document.queryCommandState('italic') || this.temAncestralTag(noAtual, ['I', 'EM']);
        this.setButtonActive('italic', isItalic);

        const isUnderline = document.queryCommandState('underline') || this.temAncestralTag(noAtual, ['U']) || this.temAncestralEstilo(noAtual, 'textDecoration', 'underline');
        this.setButtonActive('underline', isUnderline);

        const isSub = document.queryCommandState('subscript') || this.temAncestralTag(noAtual, ['SUB']);
        this.setButtonActive('subscript', isSub);

        const isSup = document.queryCommandState('superscript') || this.temAncestralTag(noAtual, ['SUP']);
        this.setButtonActive('superscript', isSup);
    }

    setButtonActive(cmd, isActive) {
        const btn = this.toolbarEl.querySelector(`[data-cmd="${cmd}"]`);
        if (btn) {
            if (isActive) {
                btn.classList.add('is-active');
            } else {
                btn.classList.remove('is-active');
            }
        }
    }

    obterNoDaSelecao() {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            return sel.getRangeAt(0).startContainer;
        }
        return null;
    }

    temAncestralTag(node, tags) {
        const tagList = Array.isArray(tags) ? tags : [tags];
        let curr = node;
        while (curr && curr !== this.editorEl) {
            if (curr.nodeName && tagList.includes(curr.nodeName.toUpperCase())) {
                return true;
            }
            curr = curr.parentNode;
        }
        return false;
    }

    temAncestralEstilo(node, propriedade, valorBusca) {
        let curr = node;
        while (curr && curr !== this.editorEl) {
            if (curr.style && curr.style[propriedade] && curr.style[propriedade].includes(valorBusca)) {
                return true;
            }
            curr = curr.parentNode;
        }
        return false;
    }

    /**
     * Insere a tag <img> no conteúdo do editor garantindo a resolução da URL completa
     */
    inserirTagImagem(url) {
        if (!url || !url.trim()) return;

        let srcCompleto = url.trim();
        if (!srcCompleto.startsWith('http://') && !srcCompleto.startsWith('https://') && !srcCompleto.startsWith('data:')) {
            const pathClean = srcCompleto.startsWith('/') ? srcCompleto : `/${srcCompleto}`;
            srcCompleto = pathClean;
        }

        const imgHtml = `<img src="${srcCompleto}" class="img-fluid rounded my-2 d-block mx-auto" style="width: 100%; max-width: 100%; height: auto;" alt="">`;
        this.editorEl.innerHTML += `<br>${imgHtml}`;
        this.focar();
    }

    inserirTextoSimples(texto) {
        this.editorEl.focus();
        document.execCommand('insertText', false, texto);
        this.atualizarEstadoBotoes();
    }

    obterHtml() {
        if (!this.editorEl) return '';
        const clone = this.editorEl.cloneNode(true);
        clone.querySelectorAll('.img-selected').forEach(img => img.classList.remove('img-selected'));
        return clone.innerHTML.trim();
    }

    obterTexto() {
        return this.editorEl ? this.editorEl.innerText.trim() : '';
    }

    definirHtml(html) {
        if (this.editorEl) {
            this.editorEl.innerHTML = html || '';
        }
    }

    focar() {
        if (this.editorEl) {
            this.editorEl.focus();
        }
    }

    escapeAttribute(str) {
        if (!str) return '';
        return String(str).replace(/"/g, '&quot;');
    }
}

// Torna a classe disponível globalmente
window.EditorQuestao = EditorQuestao;

