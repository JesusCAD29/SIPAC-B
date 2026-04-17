const crypto = require('crypto');
const Eleccion = require('../models/Eleccion');
const Ciudadano = require('../models/Ciudadano');
const Voto = require('../models/Voto');
const { Bloque } = require('../services/blockchain');

exports.obtenerEleccionesActivas = async (req, res) => {
    try {
        const elecciones = await Eleccion.find({ activa: true });
        res.json(elecciones);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener elecciones' });
    }
};

exports.obtenerBlockchain = (req, res) => {
    const urnaElecciones = req.app.locals.urnaElecciones;
    res.json({
        valida: urnaElecciones.validarCadena(),
        totalVotos: urnaElecciones.chain.length - 1,
        cadena: urnaElecciones.chain
    });
};

exports.emitirVoto = async (req, res) => {
    const { candidato } = req.body;
    const ineValidado = req.usuario.ine;
    const urnaElecciones = req.app.locals.urnaElecciones;

    if (!candidato) return res.status(400).json({ error: 'Falta el candidato seleccionado' });

    try {
        const votante = await Ciudadano.findOne({ ine: ineValidado });
        if (!votante) return res.status(404).json({ error: '❌ Ciudadano no encontrado.' });
        if (votante.haVotado) return res.status(403).json({ error: '⚠️ Usted ya ha ejercido su voto.' });

        const folioAnonimo = crypto.randomUUID();
        const nuevoVotoBloque = new Bloque(urnaElecciones.chain.length, { folio: folioAnonimo, candidato });

        urnaElecciones.agregarBloque(nuevoVotoBloque);
        await new Voto(nuevoVotoBloque).save();

        votante.haVotado = true;
        await votante.save();

        res.json({ mensaje: '✅ Voto blindado', folio: folioAnonimo });
    } catch (error) {
        res.status(500).json({ error: 'Error interno en la votación' });
    }
};