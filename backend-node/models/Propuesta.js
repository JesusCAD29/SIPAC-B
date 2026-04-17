const mongoose = require('mongoose');

const PropuestaSchema = new mongoose.Schema({
    texto: { type: String, required: true },
    fecha: { type: Date, default: Date.now },
    categoriaIA: { type: String, default: 'Pendiente' },
    confianzaIA: { type: Number, default: 0 },
    procesado: { type: Boolean, default: false },
    eleccionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Eleccion' } 
});

module.exports = mongoose.model('Propuesta', PropuestaSchema);