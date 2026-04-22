export default (sequelize, DataTypes) => {
    const HistoricoRevisaoFlashcard = sequelize.define('HistoricoRevisaoFlashcard', {
        id: {
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
        data_revisao: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        cartoes_resolvidos: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1
        }
    }, {
        tableName: 'historico_revisao_flashcard',
        timestamps: false
    });

    HistoricoRevisaoFlashcard.associate = (models) => {
        HistoricoRevisaoFlashcard.belongsTo(models.Usuario, {
            foreignKey: 'usuario_cod',
            targetKey: 'cod',
            as: 'usuario'
        });
    };

    return HistoricoRevisaoFlashcard;
};