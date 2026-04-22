export default (sequelize, DataTypes) => {
    const Cartao = sequelize.define('Cartao', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        frente: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        verso: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        imagem_url: {
            type: DataTypes.STRING,
            allowNull: true
        },
        tipo: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'tradicional' // tradicional ou escrita
        },
        fator_facilidade: {
            type: DataTypes.FLOAT,
            allowNull: false,
            defaultValue: 2.5
        },
        intervalo_dias: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        data_ultima_revisao: {
            type: DataTypes.DATE,
            allowNull: true
        },
        data_proxima_revisao: {
            type: DataTypes.DATE,
            allowNull: true
        },
        baralho_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'baralho',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        }
    }, {
        tableName: 'cartao',
        timestamps: true
    });

    Cartao.associate = (models) => {
        Cartao.belongsTo(models.Baralho, {
            foreignKey: 'baralho_id',
            targetKey: 'id',
            as: 'baralho'
        });
    };

    return Cartao;
};