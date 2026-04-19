/**
 * Eleccion.js — Modelo Mongoose para procesos electorales.
 *
 * Campos:
 *  - titulo        Nombre público del proceso (ej. "Elección Municipal 2025").
 *  - descripcion   Texto libre con detalles del proceso.
 *  - opciones      Array de strings con los nombres de los candidatos o partidos.
 *  - fechaCreacion Timestamp automático de creación por el administrador.
 *  - activa        Permite activar/desactivar la elección sin eliminarla.
 */

const mongoose = require('mongoose');

const EleccionSchema = new mongoose.Schema({
    titulo:        { type: String, required: true },
    descripcion:   String,
    opciones:      [String],
    fechaCreacion: { type: Date, default: Date.now },
    activa:        { type: Boolean, default: true }
});

module.exports = mongoose.model('Eleccion', EleccionSchema);