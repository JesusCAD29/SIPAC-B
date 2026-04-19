/**
 * middleware/auth.js — Middlewares de autenticación y autorización JWT.
 *
 * Exporta:
 *  - verificarToken: Valida que la petición incluya un JWT firmado y vigente.
 *                    Si es válido, adjunta el payload decodificado en req.usuario.
 *  - soloAdmin:      Ejecutar después de verificarToken. Permite el paso solo si
 *                    req.usuario.rol === 'admin'; de lo contrario retorna 403.
 */

const jwt = require('jsonwebtoken');

/**
 * Extrae y verifica el token del header Authorization: Bearer <token>.
 * En caso de éxito, inyecta { ine, nombre, rol } en req.usuario y llama next().
 */
const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formato: "Bearer <token>"

    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
    }

    try {
        const verificado = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = verificado; // Disponible en todos los controladores posteriores
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Token inválido o expirado.' });
    }
};

/**
 * Debe usarse siempre después de verificarToken en la cadena de middlewares.
 * Bloquea el acceso si el rol no es 'admin'.
 */
const soloAdmin = (req, res, next) => {
    if (req.usuario && req.usuario.rol === 'admin') {
        next();
    } else {
        return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Administrador.' });
    }
};

module.exports = { verificarToken, soloAdmin };