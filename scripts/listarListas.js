document.addEventListener('DOMContentLoaded', () => {
    carregarListasAdmin();
});

async function carregarListasAdmin() {
    try {
        const token = localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token');
        const response = await fetch('http://localhost:3000/api/admin/listas', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Falha ao obter listas admin');
        }

        const listas = await response.json();
        renderizarTabela(listas);
    } catch (error) {
        console.error('Erro ao carregar listas admin:', error);
        const tbody = document.getElementById('lista-tbody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted">Não foi possível carregar as listas.</td>
                </tr>
            `;
        }
    }
}

function renderizarTabela(listas) {
    const tbody = document.getElementById('lista-tbody');
    tbody.innerHTML = '';

    if (!listas || listas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">Ainda não há nenhuma lista cadastrada.</td>
            </tr>
        `;
        return;
    }

    listas.forEach(lista => {
        const tr = document.createElement('tr');
        const statusNormalizado = (lista.status || '').toLowerCase();
        let classeStatus = 'status-badge';
        let textoStatus = lista.status || '-';

        if (statusNormalizado === 'em_andamento') {
            classeStatus += ' status-em-andamento';
            textoStatus = 'Em Andamento';
        } else if (statusNormalizado === 'finalizada') {
            classeStatus += ' status-finalizada';
            textoStatus = 'Finalizada';
        }

        tr.innerHTML = `
            <td scope="row">${lista.cod}</td>
            <td>${lista.nome || '-'}</td>
            <td><span class="${classeStatus}">${textoStatus}</span></td>
            <td>${lista.usuario?.login || '-'}</td>
            <td>
                <button type="button" class="btn btn-outline-secondary rosa" onclick="confirmarExclusao(${lista.cod})">
                    <i class="bi bi-trash3"></i>
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

async function confirmarExclusao(id) {
    const confirmacao = window.confirm('Tem certeza de que deseja excluir esta lista? Todos os registros dela serão perdidos permanentemente.');

    if (!confirmacao) {
        return;
    }

    try {
        const token = localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token');
        const response = await fetch(`http://localhost:3000/api/admin/listas/${id}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const erro = await response.json();
            throw new Error(erro.error || 'Erro ao excluir lista');
        }

        carregarListasAdmin();
    } catch (error) {
        console.error('Erro ao excluir lista admin:', error);
        alert('Não foi possível excluir a lista.');
    }
}