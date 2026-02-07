export default (sequelize, DataTypes) => {
    const Historico_resultados = sequelize.define('Historico_resultados', {
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
        pontuacao: {
            type: DataTypes.DECIMAL(5,2),
            allowNull: false
        },
        data_finalizacao: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: null
        }
    }, {
        tableName: 'historico_resultados'
    });

    Historico_resultados.associate = (models) => {
        Historico_resultados.belongsTo(models.Atividade, {
            foreignKey: 'atividade_cod',
            targetKey: 'cod',
            as: 'atividade'
        })
    }

    return Historico_resultados
}