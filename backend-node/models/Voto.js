const mongoose = require('mongoose');

const VotoSchema = new mongoose.Schema({
    index: { type: Number, required: true },
    timestamp: { type: String, required: true },
    data: {
        folio: String,
        candidato: String,
        mensaje: String // Para el bloque génesis
    },
    previousHash: { type: String, required: true },
    hash: { type: String, required: true }
});

module.exports = mongoose.model('Voto', VotoSchema);