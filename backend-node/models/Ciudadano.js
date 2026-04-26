/**
 * Ciudadano.js — Modelo Mongoose para el padrón electoral.
 *
 * Campos:
 *  - nombre       Nombre completo del ciudadano.
 *  - ine           Clave de Elector (única en el sistema, actúa como username).
 *  - password      Contraseña hasheada con bcrypt.
 *  - codigoPostal  CP de residencia, usado para geocodificación.
 *  - coordenadas   Latitud/longitud obtenidas de Nominatim; alimentan el mapa de calor.
 *  - haVotado      Bandera para garantizar que cada ciudadano vote solo una vez.
 *  - rol           'ciudadano' o 'admin'. Controla el acceso a rutas protegidas.
 *  - fechaRegistro Timestamp automático de alta en el sistema.
 */

const mongoose = require('mongoose');

const CiudadanoSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    ine: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    codigoPostal: { type: String, required: true },
    coordenadas: {
        lat: { type: Number },
        lng: { type: Number }
    },
    haVotado: { type: Boolean, default: false },
    // 👇 ESTE ES EL CAMPO QUE FALTABA PARA QUE MONGOOSE LO DEJE PASAR
    eleccionesVotadas: { type: [String], default: [] },
    rol: { type: String, default: 'ciudadano' },
    fechaRegistro: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Ciudadano', CiudadanoSchema);