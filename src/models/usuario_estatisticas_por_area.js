export default (sequelize, DataTypes) => {
    const Usuario_estatisticas_por_area = sequelize.define('Usuario_estatisticas_por_area', {
        cod: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        usuario_cod: {
            type: DataTypes.INTEGER,
            references: {
                model: 'usuario',
                key: 'cod'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
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
        },
        total_questoes_respondidas: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        total_erros: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        total_acertos: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        aproveitamento_area:{
            type: DataTypes.DECIMAL(5,2),
            allowNull: false,
            defaultValue: 0.00
        },
        questoes_respondidas_lista: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        questoes_respondidas_simulado: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
    }, {
        tableName: 'usuario_estatisticas_por_area'
    });
    
    Usuario_estatisticas_por_area.associate = (models) => {
        Usuario_estatisticas_por_area.belongsTo(models.Usuario, {
            foreignKey: 'usuario_cod',
            targetKey: 'cod',
            as: 'usuario_area'
        })
        
        Usuario_estatisticas_por_area.belongsTo(models.Disciplina, {
            foreignKey: 'disciplina_cod',
            targetKey: 'cod',
            as: 'disciplina_area'
        })
    }

    indexes: [
      {
        unique: true, // Define que é uma chave única
        name: 'uk_usuario_disciplina', // O nome da constraint 
        fields: ['usuario_cod', 'disciplina_cod'] // As colunas que formam o par único
      }
    ]

    return Usuario_estatisticas_por_area
}