const mongoose = require('mongoose');

const CiudadanoSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    ine: { type: String, required: true, unique: true }, // El identificador oficial (CURP o Matrícula)
    password: { type: String, required: true }, // <-- ¡AQUÍ ESTÁ LA LLAVE DE ACCESO!
    haVotado: { type: Boolean, default: false }, // El interruptor de seguridad contra doble voto
    fechaRegistro: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Ciudadano', CiudadanoSchema);