require('dotenv').config();
const bcrypt = require('bcrypt');
const { Sequelize, DataTypes } = require('sequelize');

// Configuração do Sequelize
const sequelize = new Sequelize('NefroVetSalvador', 'root', 'ielber123', {
    host: 'localhost',
    dialect: 'mysql',
    logging: console.log,
});

// Definição do modelo de usuário
const User = sequelize.define('User', {
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    isAdmin: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
});

// Criação do usuário admin
(async () => {
    try {
        // Verifica se o usuário admin já existe no banco
        const existingAdmin = await User.findOne({ where: { isAdmin: true } });
        if (existingAdmin) {
            console.log('Admin já existe:', existingAdmin.email);
            return;
        }

        // Cria o hash da senha
        const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);

        // Cria o usuário admin
        const admin = await User.create({
            email: process.env.ADMIN_EMAIL,
            password: hashedPassword,
            isAdmin: true,
        });

        console.log('Admin Criado com sucesso', admin.email);
    } catch (error) {
        console.error('Erro ao criar admin:', error);
    }
})();

// Sincroniza o modelo com o banco de dados
sequelize.sync()
    .then(() => {
        console.log('Base de dados sincronizada.');
    })
    .catch(err => {
        console.error('Erro ao sincronizar base de dados:', err);
    });