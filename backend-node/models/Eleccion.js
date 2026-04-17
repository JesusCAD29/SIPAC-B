const mongoose = require('mongoose');

const EleccionSchema = new mongoose.Schema({
    titulo: { type: String, required: true },
    descripcion: String,
    opciones: [String],
    fechaCreacion: { type: Date, default: Date.now },
    activa: { type: Boolean, default: true }
});

module.exports = mongoose.model('Eleccion', EleccionSchema);