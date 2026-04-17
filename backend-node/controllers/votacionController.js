const crypto = require('crypto');
const Eleccion = require('../models/Eleccion');
const Ciudadano = require('../models/Ciudadano');
const Voto = require('../models/Voto');
const Propuesta = require('../models/Propuesta');
const { Bloque } = require('../services/blockchain');


exports.obtenerEleccionesActivas = async (req, res) => {
    try {
        // Al poner el find() vacío, le decimos a MongoDB que traiga TODAS las elecciones creadas
        const elecciones = await Eleccion.find(); 
        
        res.json(elecciones);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los procesos electorales' });
    }
};

exports.obtenerBlockchain = (req, res) => {
    const urnaElecciones = req.app.locals.urnaElecciones;
    const eleccionId = req.query.eleccionId; // Capturamos lo que pide el selector

    let cadenaFiltrada = urnaElecciones.chain;

    if (eleccionId) {
        // Filtramos para enviar solo el Bloque Génesis (Index 0) y los votos de esta elección
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
        if (votante.haVotado) return res.status(403).json({ error: '⚠️ Usted ya ha ejercido su voto.' });

        // 2. GUARDAMOS LA PROPUESTA SI EL CIUDADANO ESCRIBIÓ ALGO
        if (propuesta && propuesta.length > 5) {
            const nuevaPropuesta = new Propuesta({ 
                texto: propuesta,
                eleccionId: eleccionId // <-- Vinculamos la propuesta a la elección actual
            });
            await nuevaPropuesta.save();
        }

        // 3. CONTINÚA LA LÓGICA DEL VOTO BLOCKCHAIN
        const folioAnonimo = crypto.randomUUID();
        const nuevoVotoBloque = new Bloque(urnaElecciones.chain.length, {
            folio: folioAnonimo,
            candidato,
            eleccionId: eleccionId || null // 🔗 Vincula el voto a su elección
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