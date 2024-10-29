
const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root', // Cambia esto por tu usuario
    password: '', // Cambia esto por tu contraseña
    database: 'sistema_reservas', // Cambia esto por tu base de datos
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;
