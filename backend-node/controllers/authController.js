/**
 * authController.js — Controlador de autenticación de ciudadanos.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Ciudadano = require('../models/Ciudadano');
const Eleccion = require('../models/Eleccion'); // Importación necesaria para el punto 3

/**
 * Convierte un código postal mexicano en coordenadas geográficas.
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
    return { lat: 20.1011 + (Math.random() - 0.5) * 0.05, lng: -98.7591 + (Math.random() - 0.5) * 0.05 };
}

/**
 * POST /api/registro-ciudadano
 */
exports.registro = async (req, res) => {
    try {
        const { nombre, ine, password, cp } = req.body;

        // --- PUNTO 4: VALIDACIONES DE ENTRADA ---
        if (!/^\d{5}$/.test(cp)) {
            return res.status(400).json({ error: 'El Código Postal debe ser de 5 dígitos numéricos.' });
        }
        if (!/^[A-Z0-9]{18}$/.test(ine)) {
            return res.status(400).json({ error: 'La Clave de Elector (INE) debe tener 18 caracteres alfanuméricos.' });
        }

        const existe = await Ciudadano.findOne({ ine });
        if (existe) return res.status(400).json({ error: 'Esta Clave de Elector ya está registrada.' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const coords = await obtenerCoordenadas(cp);

        const nuevoCiudadano = new Ciudadano({
            nombre,
            ine,
            password: hashedPassword,
            codigoPostal: cp,
            coordenadas: coords,
            rol: 'ciudadano',
            eleccionesVotadas: [] // Inicializamos el array vacío para el Punto 3
        });

        await nuevoCiudadano.save();
        res.json({ mensaje: '✅ Ciudadano registrado con éxito (Ubicación mapeada)' });
    } catch (error) {
        res.status(500).json({ error: 'Error del servidor al guardar el registro' });
    }
};

/**
 * POST /api/login
 */
exports.login = async (req, res) => {
    const { identificador, password } = req.body;
    try {
        const usuario = await Ciudadano.findOne({ ine: identificador });
        if (!usuario) return res.status(401).json({ error: '❌ Usuario no encontrado en el padrón.' });

        const passCorrecto = await bcrypt.compare(password, usuario.password);
        if (!passCorrecto) return res.status(401).json({ error: '❌ Contraseña incorrecta.' });

        // --- PUNTO 3: LÓGICA DE BLOQUEO INTELIGENTE ---
        if (usuario.rol === 'ciudadano') {
            const eleccionesActivas = await Eleccion.find({ activa: true });
            
            // 1. Filtrar las elecciones que corresponden a su CP (Regionalización)
            const permitidas = eleccionesActivas.filter(el => {
                if (!el.cpPermitidos || el.cpPermitidos.length === 0) return true;
                return el.cpPermitidos.some(prefijo => usuario.codigoPostal.startsWith(prefijo));
            });
            
            // 2. Comparar con su historial personal
            const votadas = usuario.eleccionesVotadas || [];
            const pendientes = permitidas.filter(el => !votadas.includes(el._id.toString()));

            // 3. Bloquear solo si ya no tiene nada pendiente por lo cual votar
            if (pendientes.length === 0 && permitidas.length > 0) {
                return res.status(403).json({ 
                    error: '🏁 Ya completaste todas tus votaciones disponibles en tu zona. ¡Gracias por participar!' 
                });
            }
        }

        const tokenPayload = { 
            ine: usuario.ine, 
            nombre: usuario.nombre, 
            rol: usuario.rol,
            cp: usuario.codigoPostal 
        };
        
        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '8h' });
        const redirect = usuario.rol === 'admin' ? '/admin.html' : '/ciudadano.html';

        return res.json({ 
            mensaje: 'Acceso Autorizado', 
            token, 
            ine: usuario.ine, 
            nombre: usuario.nombre, 
            rol: usuario.rol, 
            redirect 
        });
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};