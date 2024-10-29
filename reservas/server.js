// server.js
const express = require('express');
const reservasRoutes = require('./reservasRoutes');

const app = express();
const port = 3001;

// Middleware para parsear JSON
app.use(express.json());

// Rutas
app.use('/api', reservasRoutes);

// Iniciar el servidor
app.listen(port, () => {
    console.log(`API escuchando en http://localhost:${port}`);
});

// Cerrar conexiones al finalizar el proceso
process.on('SIGINT', () => {
    console.log('Cerrando el servidor...');
    process.exit(0);
});
