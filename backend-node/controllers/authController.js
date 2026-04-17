const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Ciudadano = require('../models/Ciudadano');

exports.registro = async (req, res) => {
    try {
        const existe = await Ciudadano.findOne({ ine: req.body.ine });
        if (existe) return res.status(400).json({ error: 'Esta Clave de Elector ya está registrada.' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password, salt);

        const nuevoCiudadano = new Ciudadano({
            nombre: req.body.nombre,
            ine: req.body.ine,
            password: hashedPassword,
            rol: 'ciudadano'
        });

        await nuevoCiudadano.save();
        res.json({ mensaje: '✅ Ciudadano registrado en el padrón' });
    } catch (error) {
        res.status(500).json({ error: 'Error del servidor al guardar el registro' });
    }
};

exports.login = async (req, res) => {
    const { identificador, password } = req.body;
    try {
        const usuario = await Ciudadano.findOne({ ine: identificador });
        if (!usuario) return res.status(401).json({ error: '❌ Usuario no encontrado en el padrón.' });

        const passCorrecto = await bcrypt.compare(password, usuario.password);
        if (!passCorrecto) return res.status(401).json({ error: '❌ Contraseña incorrecta.' });

        const tokenPayload = { ine: usuario.ine, nombre: usuario.nombre, rol: usuario.rol };
        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '8h' });

        if (usuario.rol === 'ciudadano' && usuario.haVotado) {
            return res.status(403).json({ error: '⚠️ Ya has ejercido tu voto.' });
        }

        const redirect = usuario.rol === 'admin' ? '/admin.html' : '/ciudadano.html';
        return res.json({ mensaje: 'Acceso Autorizado', token, ine: usuario.ine, nombre: usuario.nombre, rol: usuario.rol, redirect });
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};