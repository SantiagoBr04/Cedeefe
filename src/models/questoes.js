export default (sequelize, DataTypes) => {
    const Questao = sequelize.define('Questao', {
        cod: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        descricao: {
            type: DataTypes.STRING,
            allowNull: false
        },
        autor: {type: DataTypes.STRING(40)},
        ano: {type: DataTypes.INTEGER},
        explicacao: {type: DataTypes.STRING},
        imagem_url: {type: DataTypes.STRING(255)},
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
        tema_cod: {
            type: DataTypes.INTEGER,
            references: { 
                model: 'tema',
                key: 'cod'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        }
    }, {
        tableName: 'questoes'
    });
    
    Questao.associate = (models) => {
        Questao.belongsTo(models.Disciplina, {
            foreignKey: 'disciplina_cod',
            targetKey: 'cod',
            as: 'disciplina'
        }),

        Questao.belongsTo(models.Tema, {
            foreignKey: 'tema_cod',
            targetKey: 'cod',
            as: 'tema'
        })

        Questao.hasMany(models.Alternativa, {
            foreignKey: 'questao_cod', 
            as: 'alternativas'         
        });
    }

    return Questao
}