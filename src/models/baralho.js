export default (sequelize, DataTypes) => {
    const Baralho = sequelize.define('Baralho', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        nome: {
            type: DataTypes.STRING(100),
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
        }
    }, {
        tableName: 'baralho',
        timestamps: true
    });

    Baralho.associate = (models) => {
        Baralho.belongsTo(models.Usuario, {
            foreignKey: 'usuario_cod',
            targetKey: 'cod',
            as: 'usuario'
        });

        Baralho.hasMany(models.Cartao, {
            foreignKey: 'baralho_id',
            sourceKey: 'id',
            as: 'cartoes',
            onDelete: 'CASCADE'
        });
    };

    return Baralho;
};