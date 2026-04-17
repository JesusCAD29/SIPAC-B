const mongoose = require('mongoose');

const CiudadanoSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    ine: { type: String, required: true, unique: true }, 
    password: { type: String, required: true }, 
    codigoPostal: { type: String, required: true }, // NUEVO: Para saber de dónde es
    coordenadas: { // NUEVO: Para el mapa de calor
        lat: { type: Number },
        lng: { type: Number }
    },
    haVotado: { type: Boolean, default: false }, 
    rol: { type: String, default: 'ciudadano' }, 
    fechaRegistro: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Ciudadano', CiudadanoSchema);