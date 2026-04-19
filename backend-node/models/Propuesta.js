/**
 * Propuesta.js — Modelo Mongoose para propuestas ciudadanas.
 *
 * Una propuesta es el texto libre que el ciudadano puede incluir
 * al momento de emitir su voto. El worker de Python (main.py) la
 * clasifica automáticamente usando NLP zero-shot.
 *
 * Campos:
 *  - texto       Propuesta escrita por el ciudadano (requerida).
 *  - fecha       Timestamp automático de recepción.
 *  - categoriaIA Categoría asignada por la IA (ej. "Salud y Bienestar").
 *                Valor inicial: 'Pendiente' hasta que el worker la procese.
 *  - confianzaIA Porcentaje de confianza del modelo NLP (0–100).
 *  - procesado   false mientras el worker no la ha analizado; true al terminar.
 *  - eleccionId  Referencia a la Eleccion a la que pertenece esta propuesta.
 */

const mongoose = require('mongoose');

const PropuestaSchema = new mongoose.Schema({
    texto:       { type: String, required: true },
    fecha:       { type: Date, default: Date.now },
    categoriaIA: { type: String, default: 'Pendiente' },
    confianzaIA: { type: Number, default: 0 },
    procesado:   { type: Boolean, default: false },
    eleccionId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Eleccion' }
});

module.exports = mongoose.model('Propuesta', PropuestaSchema);