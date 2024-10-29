// reservasController.js
const Reserva = require('./Reserva');

const formatDate = (date) => date.toISOString().split('T')[0];

const createReserva = async (req, res) => {
    const { usuario_id, local_id, recurso_id, fecha, hora, num_personas, estado } = req.body;
    try {
        const id = await Reserva.create({ usuario_id, local_id, recurso_id, fecha, hora, num_personas, estado });
        res.status(201).json({
            message: 'Reserva creada',
            reserva: {
                id,
                usuario_id,
                local_id,
                recurso_id,
                fecha,
                hora,
                num_personas,
                estado,
                fecha_creacion: formatDate(new Date()),
                ultima_modificacion: formatDate(new Date())
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al crear la reserva: ' + error.message });
    }
};

const getReservas = async (req, res) => {
    try {
        const results = await Reserva.getAll();
        const formattedResults = results.map(reserva => ({
            ...reserva,
            fecha: formatDate(reserva.fecha),
            fecha_creacion: formatDate(reserva.fecha_creacion),
            ultima_modificacion: formatDate(reserva.ultima_modificacion)
        }));
        res.json(formattedResults);
    } catch (error) {
        res.status(500).json({ error: 'Error al leer reservas: ' + error.message });
    }
};

const getReservaById = async (req, res) => {
    const { id } = req.params;
    try {
        const reserva = await Reserva.getById(id);
        if (!reserva) {
            return res.status(404).json({ message: 'Reserva no encontrada' });
        }
        res.json({
            ...reserva,
            fecha: formatDate(reserva.fecha),
            fecha_creacion: formatDate(reserva.fecha_creacion),
            ultima_modificacion: formatDate(reserva.ultima_modificacion)
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al leer la reserva: ' + error.message });
    }
};

const updateReserva = async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No se proporcionaron campos para actualizar.' });
    }
    try {
        const affectedRows = await Reserva.update(id, updates);
        if (affectedRows === 0) {
            return res.status(404).json({ error: 'Reserva no encontrada.' });
        }
        res.json({ message: 'Reserva actualizada', affectedRows });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar la reserva: ' + error.message });
    }
};

const deleteReserva = async (req, res) => {
    const { id } = req.params;
    try {
        const affectedRows = await Reserva.delete(id);
        if (affectedRows === 0) {
            return res.status(404).json({ message: 'Reserva no encontrada' });
        }
        res.json({ message: 'Reserva eliminada', affectedRows });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar la reserva: ' + error.message });
    }
};

const getReservasByUserId = async (req, res) => {
    const { id } = req.params;
    try {
        const results = await Reserva.getReservasByUserId(id);
        const formattedResults = results.map(reserva => ({
            ...reserva,
            fecha: formatDate(reserva.fecha),
            fecha_creacion: formatDate(reserva.fecha_creacion),
            ultima_modificacion: formatDate(reserva.ultima_modificacion)
        }));
        res.json(formattedResults);
    } catch (error) {
        res.status(500).json({ error: 'Error al leer reservas: ' + error.message });
    }
};

module.exports = {
    createReserva,
    getReservas,
    getReservaById,
    updateReserva,
    deleteReserva,
    getReservasByUserId
};
