const crypto = require('crypto');
const Eleccion = require('../models/Eleccion');
const Ciudadano = require('../models/Ciudadano');
const Voto = require('../models/Voto');
const Propuesta = require('../models/Propuesta');
const { Bloque } = require('../services/blockchain');

/**
 * GET /api/elecciones/activas (PÚBLICA)
 * Usada por el Observador. Retorna TODAS las elecciones.
 */
exports.obtenerEleccionesActivas = async (req, res) => {
    try {
        const elecciones = await Eleccion.find({ activa: true });
        res.json(elecciones);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener procesos' });
    }
};

/**
 * GET /api/elecciones/mis-elecciones (PROTEGIDA)
 * Usada por el panel Ciudadano. Filtra las elecciones según su prefijo de CP.
 */
exports.obtenerMisElecciones = async (req, res) => {
    try {
        const userCP = req.usuario.cp; 
        const userRol = req.usuario.rol;
        const elecciones = await Eleccion.find({ activa: true });

        if (userRol === 'admin') return res.json(elecciones);

        const ciudadano = await Ciudadano.findOne({ ine: req.usuario.ine });
        const votadas = ciudadano.eleccionesVotadas || [];

        const filtradas = elecciones.filter(el => {
            const idString = el._id.toString();
            if (votadas.includes(idString)) return false;

            if (!el.cpPermitidos || el.cpPermitidos.length === 0) return true;
            if (!userCP) return false; 
            return el.cpPermitidos.some(prefijo => userCP.startsWith(prefijo));
        });

        res.json(filtradas);
    } catch (error) {
        res.status(500).json({ error: 'Error al filtrar procesos por región' });
    }
};

// --- EL RESTO DE TUS FUNCIONES SE MANTIENEN INTACTAS ---

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
        totalVotos: cadenaFiltrada.length - 1, 
        cadena: cadenaFiltrada
    });
};

exports.emitirVoto = async (req, res) => {
    const { candidato, propuesta, eleccionId } = req.body;
    const ineValidado = req.usuario.ine; 
    const urnaElecciones = req.app.locals.urnaElecciones;

    if (!candidato) return res.status(400).json({ error: 'Falta el candidato seleccionado' });

    try {
        const votante = await Ciudadano.findOne({ ine: ineValidado });
        if (!votante) return res.status(404).json({ error: '❌ Ciudadano no encontrado.' });

        if (votante.eleccionesVotadas && votante.eleccionesVotadas.includes(eleccionId)) {
            return res.status(403).json({ error: '⚠️ Ya has ejercido tu voto en esta boleta.' });
        }

        if (propuesta && propuesta.length > 5) {
            const nuevaPropuesta = new Propuesta({ texto: propuesta, eleccionId: eleccionId });
            await nuevaPropuesta.save();
        }

        const folioAnonimo = crypto.randomUUID();
        const nuevoVotoBloque = new Bloque(urnaElecciones.chain.length, {
            folio: folioAnonimo,
            candidato,
            eleccionId: eleccionId || null
        });

        urnaElecciones.agregarBloque(nuevoVotoBloque);
        await new Voto(nuevoVotoBloque).save();

        votante.haVotado = true; 
        votante.eleccionesVotadas.push(eleccionId); 
        await votante.save();

        res.json({ mensaje: '✅ Voto blindado', folio: folioAnonimo });
    } catch (error) {
        res.status(500).json({ error: 'Error interno en la votación' });
    }
};