export default (sequelize, DataTypes) => {
    const UsuarioProgressoRoadmap = sequelize.define('Usuario_progresso_roadmap', {
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
        roadmap_slug: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        topico_id: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        concluido: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        }
    }, {
        tableName: 'usuario_progresso_roadmap',
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['usuario_cod', 'roadmap_slug', 'topico_id']
            }
        ]
    });

    UsuarioProgressoRoadmap.associate = (models) => {
        UsuarioProgressoRoadmap.belongsTo(models.Usuario, {
            foreignKey: 'usuario_cod',
            targetKey: 'cod',
            as: 'usuario'
        });
    };

    return UsuarioProgressoRoadmap;
};
