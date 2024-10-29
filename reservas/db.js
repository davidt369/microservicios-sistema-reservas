// db.js
const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root', // Cambia esto por tu usuario
    password: '', // Cambia esto por tu contraseña
    database: 'sistema_reservas',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    port: 3306
});

const promisePool = pool.promise();

module.exports = promisePool;
