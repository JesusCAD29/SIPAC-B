/**
 * Voto.js — Modelo Mongoose que persiste cada bloque de la blockchain.
 *
 * Este modelo replica la estructura de un Bloque para que la cadena
 * sobreviva reinicios del servidor. Al arrancar, server.js lee estos
 * documentos ordenados por index y reconstruye la cadena en memoria.
 *
 * Campos:
 *  - index        Posición del bloque en la cadena (0 = Bloque Génesis).
 *  - timestamp    Fecha/hora de emisión del voto en formato México/Ciudad.
 *  - data.folio      UUID anónimo que identifica el voto sin revelar al votante.
 *  - data.candidato  Nombre del candidato seleccionado.
 *  - data.eleccionId Referencia a la Eleccion correspondiente.
 *  - previousHash Hash SHA-256 del bloque anterior (garantiza inmutabilidad).
 *  - hash         Hash SHA-256 de este bloque.
 */

const mongoose = require('mongoose');

const VotoSchema = new mongoose.Schema({
    index:       Number,
    timestamp:   String,
    data: {
        folio:      String,
        candidato:  String,
        eleccionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Eleccion' }
    },
    previousHash: String,
    hash:         String
});

module.exports = mongoose.model('Voto', VotoSchema);