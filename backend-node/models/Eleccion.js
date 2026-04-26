/**
 * Eleccion.js — Modelo Mongoose para procesos electorales.
 *
 * Campos:
 *  - titulo        Nombre público del proceso (ej. "Elección Municipal 2025").
 *  - descripcion   Texto libre con detalles del proceso.
 *  - opciones      Array de strings con los candidatos en formato "Nombre (PARTIDO)".
 *  - cpPermitidos  Array de prefijos de CP para restringir la elección por zona geográfica.
 *                  Si está vacío, la elección es de alcance nacional (sin restricción).
 *  - fechaCreacion Timestamp automático de creación por el administrador.
 *  - activa        Permite pausar/reanudar la elección sin eliminarla del padrón.
 */

const mongoose = require('mongoose');

const EleccionSchema = new mongoose.Schema({
    titulo: { type: String, required: true },
    descripcion: String,
    opciones: [String],
    cpPermitidos: [String],
    fechaCreacion: { type: Date, default: Date.now },
    activa: { type: Boolean, default: true }
});

module.exports = mongoose.model('Eleccion', EleccionSchema);