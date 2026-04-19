/**
 * votacionController.js — Controlador del proceso de votación.
 *
 * Exporta:
 *  - obtenerEleccionesActivas: Lista todos los procesos electorales disponibles.
 *  - obtenerBlockchain:        Devuelve la cadena en memoria (con validación de integridad),
 *                             filtrada opcionalmente por eleccionId.
 *  - emitirVoto:              Registra un voto de forma anónima en la blockchain y en MongoDB,
 *                             y guarda la propuesta ciudadana si viene incluida.
 */

const crypto = require('crypto');
const Eleccion = require('../models/Eleccion');
const Ciudadano = require('../models/Ciudadano');
const Voto = require('../models/Voto');
const Propuesta = require('../models/Propuesta');
const { Bloque } = require('../services/blockchain');

/**
 * GET /api/elecciones/activas
 * Retorna todos los documentos de Eleccion sin filtrar.
 * El frontend es responsable de mostrar u ocultar según el campo `activa`.
 */
exports.obtenerEleccionesActivas = async (req, res) => {
    try {
        const elecciones = await Eleccion.find();
        res.json(elecciones);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los procesos electorales' });
    }
};

/**
 * GET /api/blockchain?eleccionId=<id>
 * Expone la cadena de bloques en memoria para auditoría pública.
 * Si se pasa eleccionId, filtra y envía solo el Bloque Génesis (index 0)
 * más los bloques pertenecientes a esa elección.
 *
 * Respuesta: { valida: boolean, totalVotos: number, cadena: Bloque[] }
 */
exports.obtenerBlockchain = (req, res) => {
    const urnaElecciones = req.app.locals.urnaElecciones;
    const eleccionId = req.query.eleccionId;

    let cadenaFiltrada = urnaElecciones.chain;

    if (eleccionId) {
        cadenaFiltrada = urnaElecciones.chain.filter(bloque =>
            bloque.index === 0 || (bloque.data && bloque.data.eleccionId === eleccionId)
        );
    }

    res.json({
        valida: urnaElecciones.validarCadena(),
        totalVotos: cadenaFiltrada.length - 1, // Se resta el Bloque Génesis
        cadena: cadenaFiltrada
    });
};

/**
 * POST /api/votar
 * Emite el voto de un ciudadano autenticado. Flujo:
 *  1. Verifica que el ciudadano existe y no ha votado previamente.
 *  2. Si hay propuesta con más de 5 caracteres, la persiste para análisis NLP.
 *  3. Crea un nuevo Bloque con folio UUID anónimo y lo añade a la blockchain.
 *  4. Persiste el bloque en MongoDB y marca al ciudadano como haVotado = true.
 *
 * Body esperado: { candidato: string, propuesta?: string, eleccionId: string }
 * JWT requerido: req.usuario.ine es inyectado por el middleware verificarToken.
 */
exports.emitirVoto = async (req, res) => {
    const { candidato, propuesta, eleccionId } = req.body;
    const ineValidado = req.usuario.ine; // Proviene del token; no puede ser manipulado
    const urnaElecciones = req.app.locals.urnaElecciones;

    if (!candidato) return res.status(400).json({ error: 'Falta el candidato seleccionado' });

    try {
        const votante = await Ciudadano.findOne({ ine: ineValidado });
        if (!votante) return res.status(404).json({ error: '❌ Ciudadano no encontrado.' });
        if (votante.haVotado) return res.status(403).json({ error: '⚠️ Usted ya ha ejercido su voto.' });

        // Guarda la propuesta ciudadana si viene y tiene contenido suficiente
        if (propuesta && propuesta.length > 5) {
            const nuevaPropuesta = new Propuesta({
                texto: propuesta,
                eleccionId: eleccionId
            });
            await nuevaPropuesta.save();
        }

        // Folio UUID para mantener el anonimato del votante dentro del bloque
        const folioAnonimo = crypto.randomUUID();
        const nuevoVotoBloque = new Bloque(urnaElecciones.chain.length, {
            folio: folioAnonimo,
            candidato,
            eleccionId: eleccionId || null
        });

        urnaElecciones.agregarBloque(nuevoVotoBloque);
        await new Voto(nuevoVotoBloque).save();

        votante.haVotado = true;
        await votante.save();

        res.json({ mensaje: '✅ Voto blindado', folio: folioAnonimo });
    } catch (error) {
        res.status(500).json({ error: 'Error interno en la votación' });
    }
};