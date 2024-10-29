// Reserva.js
const db = require('./db');

class Reserva {
    static async create({ usuario_id, local_id, recurso_id, fecha, hora, num_personas, estado }) {
        const sql = 'INSERT INTO reservas (usuario_id, local_id, recurso_id, fecha, hora, num_personas, estado) VALUES (?, ?, ?, ?, ?, ?, ?)';
        const [results] = await db.query(sql, [usuario_id, local_id, recurso_id, fecha, hora, num_personas, estado]);
        return results.insertId;
    }

    static async getAll() {
        const [results] = await db.query('SELECT * FROM reservas');
        return results;
    }

    static async getById(id) {
        const [results] = await db.query('SELECT * FROM reservas WHERE id = ?', [id]);
        return results[0];
    }

    static async update(id, updates) {
        const sql = 'UPDATE reservas SET ? WHERE id = ?';
        const [results] = await db.query(sql, [updates, id]);
        return results.affectedRows;
    }

    static async delete(id) {
        const [results] = await db.query('DELETE FROM reservas WHERE id = ?', [id]);
        return results.affectedRows;
    }
    
   static async getReservasByUserId(id) {
        const [results] = await db.query('SELECT * FROM reservas WHERE usuario_id = ?', [id]);
        return results;
    }
}

module.exports = Reserva;
