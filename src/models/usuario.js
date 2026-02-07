export default (sequelize, DataTypes) => {
    const Usuario = sequelize.define('Usuario', {
        cod: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        senha: {
            type: DataTypes.STRING(60),
            allowNull: false
        },
        login: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true
        },
        adm: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            default: false
        },
        data_nasc: {type: DataTypes.DATE},
        motivo: {type: DataTypes.STRING(100)},
        escola: {type: DataTypes.STRING(50)},
        genero_cod: {
            type: DataTypes.INTEGER,
            references: {
                model: 'genero',
                key: 'cod'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
        }
    }, {
        tableName: 'usuario'
    });

    Usuario.associate = (models) => {
        Usuario.belongsTo(models.Genero, {
            foreignKey: 'genero_cod',
            targetKey: 'cod',
            as: 'genero'
        })

        Usuario.hasMany(models.Usuario_estatisticas_gerais, {
            foreignKey: 'usuario_cod',
            as: 'estatisticas_gerais'
        })
    
        Usuario.hasMany(models.Usuario_estatisticas_por_area, {
            foreignKey: 'usuario_cod',
            as: 'estatisticas_areas'
        })
    
        Usuario.hasMany(models.Atividade, {
            foreignKey: 'usuario_cod',
            as: 'Atividades'
        })
    }

    return Usuario
}