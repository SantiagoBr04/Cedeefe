export default (sequelize, DataTypes) => {
    const Usuario_estatisticas_gerais = sequelize.define('Usuario_estatisticas_gerais', {
        cod: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        usuario_cod: {
            type: DataTypes.INTEGER,
            references: {
                model: 'usuario',
                key: 'cod'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        },
        total_questoes_respondidas: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        total_acertos: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        total_erros: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        aproveitamento_geral: {
            type: DataTypes.DECIMAL(5,2),
            allowNull: false,
            defaultValue: 0.00
        },
        total_listas_finalizadas: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        }
    }, {
        tableName: 'usuario_estatisticas_gerais'
    });

    Usuario_estatisticas_gerais.associate = (models) => {
        Usuario_estatisticas_gerais.belongsTo(models.Usuario, {
            foreignKey: 'usuario_cod',
            targetKey: 'cod',
            as: 'usuario_geral'
        })
    }

    return Usuario_estatisticas_gerais
}