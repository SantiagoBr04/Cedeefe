document.addEventListener('DOMContentLoaded', () => {
    carregarUsuariosAdmin();
});

async function carregarUsuariosAdmin() {
    try {
        const token = localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token');
        const response = await fetch('http://localhost:3000/api/admin/usuarios', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Falha ao obter usuários admin');
        }

        const usuarios = await response.json();
        renderizarTabelaUsuarios(usuarios);
    } catch (error) {
        console.error('Erro ao carregar usuários admin:', error);
        const tbody = document.getElementById('usuario-tbody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted">Não foi possível carregar os usuários.</td>
                </tr>
            `;
        }
    }
}

function renderizarTabelaUsuarios(usuarios) {
    const tbody = document.getElementById('usuario-tbody');
    tbody.innerHTML = '';

    if (!usuarios || usuarios.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">Ainda não há nenhum usuário cadastrado.</td>
            </tr>
        `;
        return;
    }

    usuarios.forEach(usuario => {
        const tr = document.createElement('tr');
        const tipo = usuario.adm ? 'admin' : 'estudante';

        tr.innerHTML = `
            <td scope="row">${usuario.cod}</td>
            <td>${usuario.nome_completo || '-'}</td>
            <td>${usuario.login || '-'}</td>
            <td>${tipo}</td>
            <td>
                <button type="button" class="btn btn-outline-secondary rosa" onclick="confirmarExclusaoUsuario(${usuario.cod})">
                    <i class="bi bi-trash3"></i>
                </button>
                <button type="button" class="btn btn-outline-secondary" onclick="verDetalhesUsuario(${usuario.cod})">
                    <i class="bi bi-person-lines-fill"></i>
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

async function confirmarExclusaoUsuario(cod) {
    const confirmacao = window.confirm('Tem certeza de que deseja excluir este usuário? Todos os dados vinculados a ele serão perdidos permanentemente.');

    if (!confirmacao) {
        return;
    }

    try {
        const token = localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token');
        const response = await fetch(`http://localhost:3000/api/admin/usuarios/${cod}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const erro = await response.json();
            throw new Error(erro.error || 'Erro ao excluir usuário');
        }

        carregarUsuariosAdmin();
    } catch (error) {
        console.error('Erro ao excluir usuário admin:', error);
        alert('Não foi possível excluir o usuário.');
    }
}

function verDetalhesUsuario(cod) {
    alert(`Detalhes do usuário ${cod} ainda não foram implementados.`);
}