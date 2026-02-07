export default (sequelize, DataTypes) => {
    const Disciplina = sequelize.define('Disciplina', {
        cod: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        descricao: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true
        }
    }, {
        tableName: 'disciplina'
    });

    Disciplina.associate = (models) => {
        Disciplina.hasMany(models.Tema, {
            foreignKey: 'disciplina_cod',
            as: 'disciplinas_temas'
        })

        Disciplina.hasMany(models.Questao, {
            foreignKey: 'disciplina_cod',
            as: 'disciplinas_questoes'
        })
    }

    return Disciplina
}