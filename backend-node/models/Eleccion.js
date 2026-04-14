const mongoose = require('mongoose');

const EleccionSchema = new mongoose.Schema({
    titulo: { type: String, required: true },
    descripcion: { type: String, required: true },
    // Guardamos las opciones como un arreglo (ej: ["Planilla Azul", "Planilla Roja"])
    opciones: [{ type: String, required: true }],
    fechaCreacion: { type: Date, default: Date.now },
    activa: { type: Boolean, default: true }
});

module.exports = mongoose.model('Eleccion', EleccionSchema);