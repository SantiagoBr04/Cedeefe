export default (sequelize, DataTypes) => {
    const Alternativa = sequelize.define('Alternativa', {
        cod: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        questao_cod: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'questoes', // Nome da tabela referenciada 
                key: 'cod' // Chave na tabela referenciada 
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE' // Para atualizar automaticamente quando uma questão for apagada, por exemplo
        },
        texto: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        correta: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
    }, {
        tableName: 'alternativas' // Força o nome da tabela ser essa
    });

    Alternativa.associate = (models) => {
        Alternativa.belongsTo(models.Questao, { // Uma alternativa pertence a uma questão
            foreignKey: 'questao_cod', //Qual é a FK nessa tabela 
            targetKey: 'cod', // Qual é o alvo na outra tabela (Tabela questões)
            as: 'questao' // Cria um apelido, serve para quando for buscar uma alternativa, poder pedir a questão junto
        })

        Alternativa.hasMany(models.Atividade_questoes, {
            foreignKey: 'alternativa_selecionada_cod',
            as: 'alternativasSelecionadas'
        })
    }

    
    return Alternativa;
}