const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('nefroVetSalvador', 'root', 'ielber123', {
    host: 'localhost',
    dialect: 'mysql',
    logging: console.log,
});

module.exports = sequelize;