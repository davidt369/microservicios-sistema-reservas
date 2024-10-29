// reservasRoutes.js
const express = require('express');
const { createReserva, getReservas, getReservaById, updateReserva,getReservasByUserId, deleteReserva } = require('./reservasController');
const { check, validationResult } = require('express-validator');

const router = express.Router();

// Validaciones
const reservaValidation = [
    check('usuario_id').isInt(),
    check('local_id').isInt(), // Asegúrate de incluir local_id aquí
    check('recurso_id').isInt(),
    check('fecha').isISO8601(),
    check('hora').matches(/\d{2}:\d{2}/),
    check('num_personas').isInt({ min: 1 }),
    check('estado').isIn(['confirmada', 'cancelada']),
];

// Crear reserva
router.post('/reservas', reservaValidation, (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    createReserva(req, res);
});

// Obtener todas las reservas
router.get('/reservas', getReservas);

// Obtener una reserva por ID
router.get('/reservas/:id', getReservaById);

// Actualizar reserva
router.patch('/reservas/:id', updateReserva);

// Eliminar reserva
router.delete('/reservas/:id', deleteReserva);

//obtener reservas por usuario id
router.get('/reservas/usuario/:id', getReservasByUserId);

module.exports = router;
