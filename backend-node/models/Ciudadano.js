const mongoose = require('mongoose');

const CiudadanoSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    ine: { type: String, required: true, unique: true }, 
    password: { type: String, required: true }, 
    haVotado: { type: Boolean, default: false }, 
    // NUEVO CAMPO: Define los permisos en el sistema
    rol: { type: String, default: 'ciudadano' }, 
    fechaRegistro: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Ciudadano', CiudadanoSchema);