export default (sequelize, DataTypes) => {
    const QuestaoSubtema = sequelize.define('QuestaoSubtema', {
        questao_cod: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            allowNull: false,
            references: { model: 'questoes', key: 'cod' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        },
        subtema_cod: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            allowNull: false,
            references: { model: 'subtema', key: 'cod' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        }
    }, { 
        tableName: 'questao_subtema',
        timestamps: true 
    });

    return QuestaoSubtema;
}
