const Ciudadano = require('../models/Ciudadano');
const Eleccion = require('../models/Eleccion');

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