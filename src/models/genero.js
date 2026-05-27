export default (sequelize, DataTypes) => {
    const Genero = sequelize.define('Genero', {
        cod: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        descricao: {
            type: DataTypes.STRING(30),
            allowNull: false
        }
    }, {
        tableName: 'genero'
    });

    Genero.associate = (models) => {
        Genero.hasMany(models.Usuario, {
            foreignKey: 'genero_cod',
            as: 'generos'
        })
    }

    return Genero
}