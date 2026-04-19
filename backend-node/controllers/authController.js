/**
 * authController.js — Controlador de autenticación de ciudadanos.
 *
 * Exporta:
 *  - registro: Crea un nuevo ciudadano con contraseña hasheada y coordenadas geográficas.
 *  - login:    Verifica credenciales y emite un JWT con rol, nombre e INE.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Ciudadano = require('../models/Ciudadano');

/**
 * Convierte un código postal mexicano en coordenadas geográficas
 * usando la API gratuita de Nominatim (OpenStreetMap).
 * Si el CP no se encuentra, retorna coordenadas centradas en Pachuca con
 * un pequeño desplazamiento aleatorio para evitar solapamientos en el mapa.
 *
 * @param {string} cp - Código postal de 5 dígitos.
 * @returns {{ lat: number, lng: number }}
 */
async function obtenerCoordenadas(cp) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${cp}&country=Mexico&format=json`);
        const data = await response.json();

        if (data && data.length > 0) {
            return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
    } catch (error) {
        console.log("⚠️ Error en Geocodificación:", error.message);
    }
    // Fallback: Pachuca, Hidalgo ± 0.025° (~2.5 km de desplazamiento)
    return { lat: 20.1011 + (Math.random() - 0.5) * 0.05, lng: -98.7591 + (Math.random() - 0.5) * 0.05 };
}

/**
 * POST /api/registro-ciudadano
 * Registra un nuevo ciudadano en el padrón.
 * Valida que la Clave de Elector (INE) no esté duplicada,
 * hashea la contraseña con bcrypt y geocodifica el CP antes de guardar.
 */
exports.registro = async (req, res) => {
    try {
        const existe = await Ciudadano.findOne({ ine: req.body.ine });
        if (existe) return res.status(400).json({ error: 'Esta Clave de Elector ya está registrada.' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password, salt);

        const coords = await obtenerCoordenadas(req.body.cp);

        const nuevoCiudadano = new Ciudadano({
            nombre: req.body.nombre,
            ine: req.body.ine,
            password: hashedPassword,
            codigoPostal: req.body.cp,
            coordenadas: coords,
            rol: 'ciudadano'
        });

        await nuevoCiudadano.save();
        res.json({ mensaje: '✅ Ciudadano registrado con éxito (Ubicación mapeada)' });
    } catch (error) {
        res.status(500).json({ error: 'Error del servidor al guardar el registro' });
    }
};

/**
 * POST /api/login
 * Autentica a un ciudadano o administrador.
 * Busca por INE, verifica la contraseña con bcrypt, bloquea si ya votó,
 * y retorna un JWT con expiración de 8 horas junto con la URL de redirección.
 */
exports.login = async (req, res) => {
    const { identificador, password } = req.body;
    try {
        const usuario = await Ciudadano.findOne({ ine: identificador });
        if (!usuario) return res.status(401).json({ error: '❌ Usuario no encontrado en el padrón.' });

        const passCorrecto = await bcrypt.compare(password, usuario.password);
        if (!passCorrecto) return res.status(401).json({ error: '❌ Contraseña incorrecta.' });

        const tokenPayload = { ine: usuario.ine, nombre: usuario.nombre, rol: usuario.rol };
        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '8h' });

        // Un ciudadano que ya votó no puede volver a entrar al sistema
        if (usuario.rol === 'ciudadano' && usuario.haVotado) {
            return res.status(403).json({ error: '⚠️ Ya has ejercido tu voto.' });
        }

        const redirect = usuario.rol === 'admin' ? '/admin.html' : '/ciudadano.html';
        return res.json({ mensaje: 'Acceso Autorizado', token, ine: usuario.ine, nombre: usuario.nombre, rol: usuario.rol, redirect });
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};