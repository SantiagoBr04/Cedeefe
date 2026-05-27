document.addEventListener('DOMContentLoaded', () => {
    carregarListas();
});

// Busca as listas do usuario logado no backend
async function carregarListas() {
    try {
        const token = localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token');
        const response = await fetch('http://localhost:3000/api/listas', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Falha ao obter listas');
        }

        const listas = await response.json();
        renderizarTabela(listas);

    } catch (error) {
        console.error('Erro ao carregar listas:', error);
        alert('Ocorreu um erro ao carregar as suas listas.');
    }
}

// Renderiza a tabela HTML com os dados
function renderizarTabela(listas) {
    const tbody = document.getElementById('lista-tbody');
    tbody.innerHTML = ''; 

    if (listas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">Ainda não há nenhuma lista criada.</td>
            </tr>
        `;
        return;
    }

    listas.forEach(lista => {
        const tr = document.createElement('tr');

        // Formata a data de criação
        const dataCriacaoFormato = new Date(lista.data_criacao).toLocaleDateString();

        // Determina formatação do status
        let classeBadge = '';
        let textoStatus = '';

        if (lista.status === 'em_andamento') {
            classeBadge = 'status-em-andamento';
            textoStatus = 'Em Andamento';
        } else if (lista.status === 'finalizada') {
            classeBadge = 'status-finalizada';
            textoStatus = 'Finalizada';
        }

        tr.innerHTML = `
            <td scope="row">${lista.nome}</td>
            <td>${dataCriacaoFormato}</td>
            <td>${lista.quantidade_questoes}</td>
            <td><span class="status-badge ${classeBadge}">${textoStatus}</span></td>
            <td>
                <button type="button" class="btn btn-outline-secondary rosa" onclick="confirmarExclusao(${lista.cod})"> 
                    <i class="bi bi-trash3"></i> 
                </button>
                <button type="button" class="btn btn-outline-secondary verde" onclick="acessarLista(${lista.cod})"> 
                    <i class="bi bi-play"></i> 
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

// Direciona o clique do botao play
function acessarLista(id) {
    // Redireciona para a tela de fazerLista enviando o param codLista na url (como ja adotado no front)
    window.location.href = `fazendoLista.html?codLista=${id}`;
}

// Processo de envio da requisicao de exclusao
async function confirmarExclusao(id) {
    const confirmacao = window.confirm("Tem certeza de que deseja excluir esta lista? Todos os registros dela serão perdidos permanentemente.");

    if (confirmacao) {
        try {
            const token = localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token');
            const response = await fetch(`http://localhost:3000/api/listas/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Erro ao deletar lista');
            }

            // Apos a exclusao ser confirmada pelo backend recarrega as listas no front
            carregarListas();
            
        } catch (error) {
            console.error('Erro ao deletar lista:', error);
            alert('Não foi possível excluir a lista.');
        }
    }
}