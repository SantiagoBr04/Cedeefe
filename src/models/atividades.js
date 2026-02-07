export default (sequelize, DataTypes) => {
    const Atividade = sequelize.define('Atividade', {
        cod: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        usuario_cod: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'usuario',
                key: 'cod'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        },
        nome: {
            type: DataTypes.STRING(100),
        },
        status: {
            type: DataTypes.ENUM('em_andamento', 'finalizada'),
            allowNull: false,
            defaultValue: 'em_andamento'
        },
        tipo: {
            type: DataTypes.ENUM('lista', 'simulado'),
            allowNull: false
        }
    }, {
        tableName: 'atividades',
        createdAt: 'data_criacao'
    });

    Atividade.associate = (models) => {
        Atividade.belongsTo(models.Usuario, {
            foreignKey: 'usuario_cod',
            targetKey: 'cod',
            as: 'usuario'
        })
    
        Atividade.hasMany(models.Atividade_questoes, {
            foreignKey: 'atividade_cod',
            as: 'registroDasQuestoes'
        })
    
        Atividade.hasMany(models.Historico_resultados, {
            foreignKey: 'atividade_cod',
            as: 'HistoricoResultados'
        })
    }  

    return Atividade
}