const mongoose = require('mongoose');

const CiudadanoSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    ine: { type: String, required: true, unique: true }, // El identificador oficial
    haVotado: { type: Boolean, default: false }, // El interruptor de seguridad
    fechaRegistro: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Ciudadano', CiudadanoSchema);