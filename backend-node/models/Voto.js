const mongoose = require('mongoose');

const VotoSchema = new mongoose.Schema({
    index: Number,
    timestamp: String,
    data: {
        folio: String,
        candidato: String,
        eleccionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Eleccion' } // <-- Vínculo vital
    },
    previousHash: String,
    hash: String
});

module.exports = mongoose.model('Voto', VotoSchema);