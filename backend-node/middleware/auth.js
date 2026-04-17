// middleware/auth.js
const jwt = require('jsonwebtoken');

// 1. Verifica que el usuario tenga un token válido
const verificarToken = (req, res, next) => {
    // Busca el token en los headers (Authorization: Bearer <token>)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
    }

    try {
        // Verifica que la firma sea válida y que no haya expirado
        const verificado = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = verificado; // Guarda los datos del usuario en la request (ej. req.usuario.rol)
        next(); // Le permite pasar a la ruta solicitada
    } catch (error) {
        return res.status(403).json({ error: 'Token inválido o expirado.' });
    }
};

// 2. Verifica específicamente que el usuario tenga rol de Administrador
const soloAdmin = (req, res, next) => {
    if (req.usuario && req.usuario.rol === 'admin') {
        next();
    } else {
        return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Administrador.' });
    }
};

module.exports = { verificarToken, soloAdmin };