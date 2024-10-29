const express = require('express');
const connection = require('./db');
const { body, validationResult } = require('express-validator');
const dayjs = require('dayjs'); // Usar dayjs para manejar fechas y horas
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat); // Extensión para permitir el formato personalizado

const app = express();
const port = 3002;

// Middleware para parsear el cuerpo de las solicitudes
app.use(express.json());

// Middleware de validación para crear disponibilidad
const validateDisponibilidad = [
    body('recurso_id').isInt().withMessage('El recurso_id debe ser un número entero.'),
    body('fecha').isString().withMessage('La fecha debe ser una cadena válida en formato YYYY-MM-DD.'),
    body('hora_inicio').isString().withMessage('La hora_inicio debe ser una cadena en formato HH:mm.'),
    body('hora_fin').isString().withMessage('La hora_fin debe ser una cadena en formato HH:mm.'),
    body('disponible').isBoolean().withMessage('El campo disponible debe ser un booleano.')
];

// Crear disponibilidad
app.post('/api/disponibilidad', validateDisponibilidad, (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { recurso_id, fecha, hora_inicio, hora_fin, disponible } = req.body;

    // Validar fecha y horas con dayjs
    const fechaValida = dayjs(fecha, 'YYYY-MM-DD', true);  // El tercer argumento `true` asegura que el formato se valide estrictamente
    const horaInicioValida = dayjs(hora_inicio, 'HH:mm', true);
    const horaFinValida = dayjs(hora_fin, 'HH:mm', true);

    if (!fechaValida.isValid() || !horaInicioValida.isValid() || !horaFinValida.isValid()) {
        return res.status(400).json({ error: 'Fecha u hora no válidas' });
    }

    const sql = 'INSERT INTO disponibilidad (recurso_id, fecha, hora_inicio, hora_fin, disponible) VALUES (?, ?, ?, ?, ?)';
    const values = [recurso_id, fechaValida.format('YYYY-MM-DD'), horaInicioValida.format('HH:mm'), horaFinValida.format('HH:mm'), disponible];

    connection.query(sql, values, (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error al crear disponibilidad: ' + err.message });
        }
        res.status(201).json({ message: 'Disponibilidad creada', id: results.insertId });
    });
});

// Leer disponibilidad
app.get('/api/disponibilidad', (req, res) => {
    const { id, recurso_id, fecha } = req.query;

    let sql = 'SELECT * FROM disponibilidad WHERE 1=1';
    const params = [];

    if (id) {
        sql += ' AND id = ?';
        params.push(id);
    }

    if (recurso_id) {
        sql += ' AND recurso_id = ?';
        params.push(recurso_id);
    }

    if (fecha) {
        try {
            const fechaValida = dayjs(fecha, 'YYYY-MM-DD');
            if (!fechaValida.isValid()) {
                return res.status(400).json({ error: 'Fecha no válida' });
            }
            sql += ' AND fecha = ?';
            params.push(fechaValida.format('YYYY-MM-DD'));
        } catch (error) {
            return res.status(400).json({ error: 'Error al procesar la fecha: ' + error.message });
        }
    }

    connection.query(sql, params, (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error al leer disponibilidad: ' + err.message });
        }
        res.json(results);
    });
});

// Actualizar disponibilidad
app.patch('/api/disponibilidad/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    if (updates.fecha) {
        const fechaValida = dayjs(updates.fecha, 'YYYY-MM-DD');
        if (!fechaValida.isValid()) {
            return res.status(400).json({ error: 'Fecha no válida' });
        }
        updates.fecha = fechaValida.format('YYYY-MM-DD');
    }

    if (updates.hora_inicio) {
        const horaInicioValida = dayjs(updates.hora_inicio, 'HH:mm');
        if (!horaInicioValida.isValid()) {
            return res.status(400).json({ error: 'Hora de inicio no válida' });
        }
        updates.hora_inicio = horaInicioValida.format('HH:mm');
    }

    if (updates.hora_fin) {
        const horaFinValida = dayjs(updates.hora_fin, 'HH:mm');
        if (!horaFinValida.isValid()) {
            return res.status(400).json({ error: 'Hora de fin no válida' });
        }
        updates.hora_fin = horaFinValida.format('HH:mm');
    }

    const sql = 'UPDATE disponibilidad SET ? WHERE id = ?';
    connection.query(sql, [updates, id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error al actualizar disponibilidad: ' + err.message });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Disponibilidad no encontrada' });
        }
        res.json({ message: 'Disponibilidad actualizada' });
    });
});

// Eliminar disponibilidad
app.delete('/api/disponibilidad/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM disponibilidad WHERE id = ?';

    connection.query(sql, [id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error al eliminar disponibilidad: ' + err.message });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Disponibilidad no encontrada' });
        }
        res.json({ message: 'Disponibilidad eliminada' });
    });
});

// Verificar disponibilidad
app.get('/api/verificar-disponibilidad', (req, res) => {
    const { recurso_id, fecha, hora } = req.query;

    try {
        const fechaValida = dayjs(fecha, 'YYYY-MM-DD');
        const horaValida = dayjs(hora, 'HH:mm');

        if (!fechaValida.isValid() || !horaValida.isValid()) {
            return res.status(400).json({ error: 'Fecha u hora no válidas' });
        }

        const sql = 'SELECT disponible FROM disponibilidad WHERE recurso_id = ? AND fecha = ? AND hora_inicio <= ? AND hora_fin >= ?';
        connection.query(sql, [recurso_id, fechaValida.format('YYYY-MM-DD'), horaValida.format('HH:mm'), horaValida.format('HH:mm')], (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Error al verificar disponibilidad: ' + err.message });
            }
            const isAvailable = results.length > 0 && results[0].disponible;
            res.json({ disponible: isAvailable });
        });
    } catch (error) {
        res.status(400).json({ error: 'Error al procesar la fecha o la hora: ' + error.message });
    }
});

// Obtener disponibilidad por ID
app.get('/api/disponibilidad/:id', (req, res) => {
    const { id } = req.params; // Obtiene el parámetro de la ruta (id)

    const sql = 'SELECT * FROM disponibilidad WHERE id = ?';
    
    connection.query(sql, [id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error al leer disponibilidad: ' + err.message });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Disponibilidad no encontrada' });
        }

        res.json(results[0]); // Devuelve la primera disponibilidad encontrada
    });
});


// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor de disponibilidad escuchando en http://localhost:${port}`);
});
