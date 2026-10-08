export default (sequelize, DataTypes) => {
    const Subtema = sequelize.define('Subtema', {
        cod: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        descricao: {
            type: DataTypes.STRING(255),
            allowNull: false      
        },
        tema_cod: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'tema',
                key: 'cod'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        }
    }, {
        tableName: 'subtema'
    });

    Subtema.associate = (models) => {
        Subtema.belongsTo(models.Tema, {
            foreignKey: 'tema_cod',
            as: 'tema'
        });
        Subtema.belongsToMany(models.Questao, { 
            through: models.QuestaoSubtema,
            foreignKey: 'subtema_cod',
            otherKey: 'questao_cod',
            as: 'questoes' 
        });
    }

    return Subtema;
}
