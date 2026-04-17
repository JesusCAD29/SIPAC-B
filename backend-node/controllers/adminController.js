const Ciudadano = require('../models/Ciudadano');
const Eleccion = require('../models/Eleccion');
const Propuesta = require('../models/Propuesta');
const Voto = require('../models/Voto');

exports.obtenerPadron = async (req, res) => {
    try {
        const ciudadanos = await Ciudadano.find().select('-password').sort({ fechaRegistro: -1 });
        res.json(ciudadanos);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los datos del padrón' });
    }
};

exports.crearEleccion = async (req, res) => {
    try {
        const nuevaEleccion = new Eleccion({
            titulo: req.body.titulo,
            descripcion: req.body.descripcion,
            opciones: req.body.opciones
        });
        await nuevaEleccion.save();
        res.json({ mensaje: '✅ Proceso electoral creado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al crear la elección' });
    }
};

exports.obtenerAnaliticasNLP = async (req, res) => {
    try {
        // Solo traemos las propuestas que la IA ya terminó de procesar
        const propuestas = await Propuesta.find({ procesado: true }).sort({ fecha: -1 });
        
        // Agrupamos los datos para que la gráfica los digiera fácil
        const conteoCategorias = {};
        propuestas.forEach(p => {
            const cat = p.categoriaIA;
            conteoCategorias[cat] = (conteoCategorias[cat] || 0) + 1;
        });

        res.json({
            totales: conteoCategorias,
            listaPropuestas: propuestas // Mandamos los textos por si los quieres leer
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener analíticas de IA' });
    }
};

exports.obtenerEstadisticasGlobales = async (req, res) => {
    try {
        const { eleccionId } = req.query; // Capturamos el ID del frontend

        // Armamos los filtros dinámicamente
        const filtroVotos = eleccionId ? { 'data.eleccionId': eleccionId } : {};
        const filtroPropuestas = eleccionId ? { procesado: true, eleccionId: eleccionId } : { procesado: true };

        // Buscamos en MongoDB aplicando los filtros
        const votos = await Voto.find(filtroVotos);
        const propuestas = await Propuesta.find(filtroPropuestas);

        // Agrupamos votos por candidato
        const conteoVotos = {};
        votos.forEach(v => {
            if(v.index === 0) return; 
            const can = v.data.candidato;
            conteoVotos[can] = (conteoVotos[can] || 0) + 1;
        });

        // Agrupamos propuestas por categoría IA
        const conteoIA = {};
        propuestas.forEach(p => {
            const cat = p.categoriaIA;
            conteoIA[cat] = (conteoIA[cat] || 0) + 1;
        });

        res.json({ votos: conteoVotos, ia: conteoIA, propuestas });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener estadísticas filtradas' });
    }
};