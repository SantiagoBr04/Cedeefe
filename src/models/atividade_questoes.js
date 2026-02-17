export default (sequelize, DataTypes) => {
    const Atividade_questoes = sequelize.define('Atividade_questoes', {
        cod: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        atividade_cod: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'atividades',
                key: 'cod'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        },
        questao_cod: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'questoes',
                key: 'cod'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        },
        alternativa_selecionada_cod: {
            type: DataTypes.INTEGER,
            references: {
                model: 'alternativas',
                key: 'cod'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        },
    }, {
        tableName: 'atividade_questoes',
    });

    Atividade_questoes.associate = (models) => {

        Atividade_questoes.belongsTo(models.Atividade, {
            foreignKey: 'atividade_cod',
            targetKey: 'cod',
            as: 'atividade'
        })

        Atividade_questoes.belongsTo(models.Questao, {
            foreignKey: 'questao_cod',
            targetKey: 'cod',
            as: 'questao'
        })

        Atividade_questoes.belongsTo(models.Alternativa, {
            foreignKey: 'alternativa_selecionada_cod',
            targetKey: 'cod',
            as: 'alternativaSelecionada'
        })
    };

    return Atividade_questoes
}