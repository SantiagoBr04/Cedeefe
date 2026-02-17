export default (sequelize, DataTypes) => {
    const Tema = sequelize.define('Tema', {
        cod: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        descricao: {
            type: DataTypes.STRING(30),
            allowNull: false      
        },
        disciplina_cod: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'disciplina',
                key: 'cod'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        }
    }, {
        tableName: 'tema'
    });

    Tema.associate = (models) => {
        Tema.belongsTo(models.Disciplina, {
            foreignKey: 'disciplina_cod',
            targetKey: 'cod',
            as: 'disciplina'
        })
    }

    return Tema
}