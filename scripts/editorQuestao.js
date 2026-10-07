/**
 * Componente Reutilizável de Editor de Texto Enriquecido (Rich Text Editor) para o Cedeefe.
 * Suporta formatação essencial, estado ativo de botões, inserção de imagens e símbolos matemáticos.
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
            onContentChange: null,
            permitirImagem: false,
            sessaoImagens: null, // Instância de SessaoImagensQuestao
            imagemLegadaUrl: null
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
        this.rangeSelecaoSalvo = null;

        const toolbarButtonsHtml = this.options.compact ? this.renderizarToolbarCompacta() : this.renderizarToolbarCompleta();

        this.container.innerHTML = `
            <div class="editor-toolbar" id="toolbar-${this.idUnico}">
                ${toolbarButtonsHtml}
            </div>
            <div class="editor-contentarea" id="area-${this.idUnico}" contenteditable="true" placeholder="${this.escapeAttribute(this.options.placeholder)}"></div>
            <input type="file" id="file-${this.idUnico}" accept="image/*" style="display: none;">
        `;

        this.toolbarEl = this.container.querySelector('.editor-toolbar');
        this.editorEl = this.container.querySelector('.editor-contentarea');
        this.fileInputEl = this.container.querySelector(`#file-${this.idUnico}`);

        if (this.options.initialValue || this.options.imagemLegadaUrl) {
            this.definirHtml(this.options.initialValue || '');
        }

        // Observa mudanças de tamanho nas imagens (ex: quando terminam de carregar) para reposicionar a alça
        this.resizeObserver = new ResizeObserver(() => {
            if (this.imagemSelecionada) {
                this.posicionarToolbarImagem();
            }
        });
        this.resizeObserver.observe(this.editorEl);

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

            ${this.options.permitirImagem ? `<button type="button" class="btn-fmt btn-imagem" title="Inserir Imagem"><i class="bi bi-image"></i> Imagem</button>` : ''}

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
            ${this.options.permitirImagem ? `<button type="button" class="btn-fmt btn-imagem" title="Inserir Imagem"><i class="bi bi-image"></i></button>` : ''}
        `;
    }

    vincularEventos() {
        const atualizarAtivos = () => this.atualizarEstadoBotoes();

        this.editorEl.addEventListener('keyup', atualizarAtivos);
        this.editorEl.addEventListener('mouseup', atualizarAtivos);
        this.editorEl.addEventListener('focus', atualizarAtivos);

        this.editorEl.addEventListener('click', (e) => {
            atualizarAtivos();
            if (e.target && e.target.tagName === 'IMG' && e.target.classList.contains('img-questao')) {
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
            // Excluir imagem se selecionada e apertar Backspace ou Delete
            if ((e.key === 'Backspace' || e.key === 'Delete') && this.imagemSelecionada) {
                e.preventDefault();
                this.imagemSelecionada.remove();
                this.desselecionarImagem();
                this.dispararMudanca();
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

        const btnImagem = this.toolbarEl.querySelector('.btn-imagem');
        if (btnImagem) {
            btnImagem.addEventListener('click', (e) => {
                e.preventDefault();
                this.salvarSelecao();
                this.fileInputEl.click();
            });
        }

        if (this.fileInputEl) {
            this.fileInputEl.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.fazerUploadImagem(file);
                }
                this.fileInputEl.value = ''; // Limpa para permitir upload do mesmo arquivo
            });
        }

        if (typeof this.options.onContentChange === 'function') {
            this.editorEl.addEventListener('input', () => {
                this.options.onContentChange(this.obterHtml());
            });
        }
        
        this.vincularEventosDragImagem();
    }
    
    salvarSelecao() {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && this.editorEl.contains(sel.anchorNode)) {
            this.rangeSelecaoSalvo = sel.getRangeAt(0);
        } else {
            this.rangeSelecaoSalvo = null;
        }
    }

    restaurarSelecao() {
        if (this.rangeSelecaoSalvo) {
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(this.rangeSelecaoSalvo);
        } else {
            this.focar();
        }
    }

    async fazerUploadImagem(file) {
        try {
            // Mostrar estado de loading
            const loadingOverlay = document.createElement('div');
            loadingOverlay.className = 'editor-loading-overlay';
            loadingOverlay.innerHTML = '<div class="spinner-border text-pink" role="status"><span class="visually-hidden">Enviando...</span></div>';
            this.container.appendChild(loadingOverlay);

            const formData = new FormData();
            formData.append('imagem', file);

            const token = localStorage.getItem('jwt_token');
            const API_URL = typeof window.API_BASE_URL !== 'undefined' ? window.API_BASE_URL : '/api';
            const resposta = await fetch(`${API_URL}/questoes/upload-imagem`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            loadingOverlay.remove();

            if (!resposta.ok) {
                throw new Error('Falha no upload da imagem');
            }

            const dados = await resposta.json();
            const urlImagem = dados.imagem_url || dados.url;
            if (urlImagem) {
                if (this.options.sessaoImagens) {
                    this.options.sessaoImagens.registrar(urlImagem);
                }
                this.restaurarSelecao();
                this.inserirTagImagem(urlImagem);
            }
        } catch (erro) {
            console.error('[EditorQuestao] Erro upload imagem:', erro);
            alert('Erro ao enviar imagem. Tente novamente.');
            const overlay = this.container.querySelector('.editor-loading-overlay');
            if (overlay) overlay.remove();
        }
    }

    vincularEventosDragImagem() {
        let draggingImg = null;
        let startX, startY;
        let imgStartWidth;
        let isResizing = false;
        
        // Resize
        this.container.addEventListener('pointerdown', (e) => {
            if (e.target.classList.contains('editor-img-alca') && this.imagemSelecionada) {
                e.preventDefault();
                e.stopPropagation();
                isResizing = true;
                startX = e.clientX;
                imgStartWidth = this.imagemSelecionada.offsetWidth;
                this.imagemSelecionada.style.transition = 'none'; // Suavidade manual
                document.body.style.cursor = 'ew-resize';
                e.target.setPointerCapture(e.pointerId);
            }
        });

        // Drag da imagem (mover de lugar)
        this.editorEl.addEventListener('pointerdown', (e) => {
            if (e.target.tagName === 'IMG' && e.target.classList.contains('img-questao') && !isResizing) {
                // Não inicia drag se clicou fora (apenas seleciona)
                draggingImg = e.target;
            }
        });

        document.addEventListener('pointermove', (e) => {
            if (isResizing && this.imagemSelecionada) {
                if (e.cancelable) e.preventDefault();
                const containerWidth = this.editorEl.clientWidth;
                const deltaX = e.clientX - startX;
                let newWidth = imgStartWidth + (deltaX * 2); 
                
                const minWidth = containerWidth * 0.1;
                const maxWidth = containerWidth;
                
                newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
                
                const percentage = Math.round((newWidth / containerWidth) * 100);
                this.imagemSelecionada.style.width = `${percentage}%`;
                
                if (this.toolbarImagemEl) {
                    const selo = this.toolbarImagemEl.querySelector('.tamanho-selo');
                    if (selo) selo.textContent = `${percentage}%`;
                    this.posicionarToolbarImagem();
                }
            } else if (draggingImg && this.imagemSelecionada === draggingImg) {
                // Para simplificar no MVP, o drag-to-move vai apenas mudar o cursor nativamente se não prevenirmos, 
                // mas `draggable=false` previne. Vamos implementar a lógica da guia de caret.
                // Requer desenhar um "caret falso" na posição do mouse.
                // Como não foi especificado nos detalhes a UI do caret falso, e a API é complexa cross-browser,
                // Uma solução robusta é habilitar draggable=true somente quando selecionado, 
                // mas o Firefox tem bugs de duplicação.
                // Deixaremos o pointermove silencioso e resolveremos no pointerup via caretRangeFromPoint.
            }
        });

        document.addEventListener('pointerup', (e) => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = '';
                if (this.imagemSelecionada) {
                    this.imagemSelecionada.style.transition = '';
                    this.dispararMudanca();
                }
                const alca = this.container.querySelector('.editor-img-alca');
                if (alca && alca.hasPointerCapture(e.pointerId)) {
                    alca.releasePointerCapture(e.pointerId);
                }
            } else if (draggingImg) {
                // O usuário soltou o mouse. Foi um drag longo ou só um click?
                // Mover a imagem para a nova posição do cursor se soltou longe
                if (this.editorEl.contains(e.target) && e.target !== draggingImg) {
                    let range;
                    if (document.caretRangeFromPoint) {
                        range = document.caretRangeFromPoint(e.clientX, e.clientY);
                    } else if (document.caretPositionFromPoint) {
                        const pos = document.caretPositionFromPoint(e.clientX, e.clientY);
                        if (pos) {
                            range = document.createRange();
                            range.setStart(pos.offsetNode, pos.offset);
                            range.collapse(true);
                        }
                    }
                    
                    if (range) {
                        range.insertNode(draggingImg);
                        // Limpar espacos vazios deixados pode ser feito, mas insertNode move o elemento na DOM.
                        this.dispararMudanca();
                        this.posicionarToolbarImagem();
                    }
                }
                draggingImg = null;
            }
        });
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
        const alca = this.container.querySelector('.editor-img-alca');
        if (alca) alca.remove();
    }

    criarToolbarImagem() {
        if (this.toolbarImagemEl) {
            this.toolbarImagemEl.remove();
        }

        const toolbar = document.createElement('div');
        toolbar.className = 'editor-img-toolbar shadow-sm border rounded p-1 d-flex align-items-center bg-white position-absolute';
        toolbar.style.zIndex = '1000';
        
        const widthAtual = this.imagemSelecionada.style.width || '100%';

        toolbar.innerHTML = `
            <span class="toolbar-label me-2 ms-1 text-muted small"><i class="bi bi-arrows-angle-expand"></i> <span class="tamanho-selo fw-bold">${widthAtual}</span></span>
            <div class="border-start mx-1 h-100"></div>
            <button type="button" class="btn btn-sm btn-link text-danger btn-img-delete" title="Excluir Imagem"><i class="bi bi-trash3-fill"></i></button>
        `;

        this.container.appendChild(toolbar);
        this.toolbarImagemEl = toolbar;

        // Criar alça de resize
        const alca = document.createElement('div');
        alca.className = 'editor-img-alca position-absolute';
        alca.style.width = '16px';
        alca.style.height = '16px';
        alca.style.backgroundColor = '#c23672';
        alca.style.border = '2px solid white';
        alca.style.borderRadius = '50%';
        alca.style.cursor = 'ew-resize';
        alca.style.zIndex = '1000';
        this.container.appendChild(alca);

        const btnDelete = toolbar.querySelector('.btn-img-delete');
        if (btnDelete) {
            btnDelete.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.imagemSelecionada) {
                    this.imagemSelecionada.remove();
                    this.desselecionarImagem();
                    this.dispararMudanca();
                }
            });
        }

        this.posicionarToolbarImagem();
    }

    posicionarToolbarImagem() {
        if (!this.toolbarImagemEl || !this.imagemSelecionada || !this.container) return;

        const containerRect = this.container.getBoundingClientRect();
        const imgRect = this.imagemSelecionada.getBoundingClientRect();

        let top = (imgRect.top - containerRect.top) - 40;
        if (top < 0) {
            top = (imgRect.bottom - containerRect.top) + 5;
        }

        let left = (imgRect.left - containerRect.left) + (imgRect.width / 2) - (this.toolbarImagemEl.offsetWidth / 2);
        
        this.toolbarImagemEl.style.top = `${top}px`;
        this.toolbarImagemEl.style.left = `${left}px`;
        
        // Posicionar a alça (canto inferior direito)
        const alca = this.container.querySelector('.editor-img-alca');
        if (alca) {
            alca.style.top = `${(imgRect.bottom - containerRect.top) - 8}px`;
            alca.style.left = `${(imgRect.right - containerRect.left) - 8}px`;
        }
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
        this.dispararMudanca();
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
     * Insere a tag <img> no conteúdo do editor garantindo a resolução da URL completa.
     * Pode ser chamado externamente.
     */
    inserirTagImagem(url) {
        if (!url || !url.trim()) return;

        let srcCompleto = url.trim();
        if (!srcCompleto.startsWith('http://') && !srcCompleto.startsWith('https://') && !srcCompleto.startsWith('data:')) {
            const pathClean = srcCompleto.startsWith('/') ? srcCompleto : `/${srcCompleto}`;
            srcCompleto = pathClean;
        }

        const imgHtml = `<img src="${srcCompleto}" class="img-questao" style="display:block; width:60%; max-width:100%; height:auto; margin:8px auto;" alt="" draggable="false">`;
        
        // Se temos um range salvo, insere lá. Senão, vai no final.
        if (this.rangeSelecaoSalvo) {
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(this.rangeSelecaoSalvo);
            
            const frag = document.createRange().createContextualFragment(imgHtml + '&nbsp;');
            this.rangeSelecaoSalvo.insertNode(frag);
            
            // Coloca o cursor depois da imagem
            this.rangeSelecaoSalvo.collapse(false);
            this.rangeSelecaoSalvo = null;
        } else {
            this.editorEl.innerHTML += `<br>${imgHtml}<br>`;
        }
        
        this.focar();
        this.dispararMudanca();
    }

    inserirTextoSimples(texto) {
        this.editorEl.focus();
        document.execCommand('insertText', false, texto);
        this.atualizarEstadoBotoes();
        this.dispararMudanca();
    }

    obterHtml() {
        if (!this.editorEl) return '';
        const clone = this.editorEl.cloneNode(true);
        // Remove classes temporárias de seleção
        clone.querySelectorAll('.img-selected').forEach(img => img.classList.remove('img-selected'));
        // Garante que draggable e img-questao estão corretos
        clone.querySelectorAll('img').forEach(img => {
            img.draggable = false;
            if (!img.classList.contains('img-questao')) img.classList.add('img-questao');
        });
        return clone.innerHTML.trim();
    }

    obterTexto() {
        return this.editorEl ? this.editorEl.innerText.trim() : '';
    }

    definirHtml(html) {
        if (!this.editorEl) return;
        
        let novoHtml = html || '';
        
        // Normaliza imagens antigas para o novo formato
        if (novoHtml) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = novoHtml;
            tempDiv.querySelectorAll('img').forEach(img => {
                img.draggable = false;
                if (!img.classList.contains('img-questao')) img.classList.add('img-questao');
                // Se for a imagem antiga inline, preserva o tamanho se houver, ou ajusta
                if (!img.style.width) img.style.width = '60%';
            });
            novoHtml = tempDiv.innerHTML;
        }

        // Se há uma URL legada e o HTML não possui nenhuma imagem, coloca a imagem legada no topo
        if (this.options.imagemLegadaUrl && !novoHtml.includes('<img')) {
            const legadaHtml = `<img src="${this.options.imagemLegadaUrl}" class="img-questao" style="display:block; width:60%; max-width:100%; height:auto; margin:8px auto;" alt="" draggable="false"><br>`;
            novoHtml = legadaHtml + novoHtml;
        }

        this.editorEl.innerHTML = novoHtml;
    }

    focar() {
        if (this.editorEl) {
            this.editorEl.focus();
        }
    }
    
    dispararMudanca() {
        if (typeof this.options.onContentChange === 'function') {
            this.options.onContentChange(this.obterHtml());
        }
    }

    escapeAttribute(str) {
        if (!str) return '';
        return String(str).replace(/"/g, '&quot;');
    }
}

// Torna a classe disponível globalmente
window.EditorQuestao = EditorQuestao;
