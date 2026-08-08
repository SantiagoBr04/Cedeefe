export default (sequelize, DataTypes) => {
    const QuestaoReportada = sequelize.define('QuestaoReportada', {
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
                model: 'questoes',
                key: 'cod'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
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
        motivo: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        descricao_detalhada: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        status: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'pendente' // 'pendente', 'resolvido', 'descartado'
        }
    }, {
        tableName: 'questoes_reportadas'
    });

    QuestaoReportada.associate = (models) => {
        QuestaoReportada.belongsTo(models.Questao, {
            foreignKey: 'questao_cod',
            targetKey: 'cod',
            as: 'questao'
        });

        QuestaoReportada.belongsTo(models.Usuario, {
            foreignKey: 'usuario_cod',
            targetKey: 'cod',
            as: 'usuario'
        });
    };

    return QuestaoReportada;
};
