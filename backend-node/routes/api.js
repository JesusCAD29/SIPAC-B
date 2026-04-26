/**
 * routes/api.js — Router maestro de la API REST de SIPAC-B.
 *
 * Agrupa todas las rutas bajo el prefijo /api (montado en server.js).
 * Aplica middlewares de autenticación según el nivel de acceso requerido:
 *
 *  Públicas (sin token):
 *    POST /api/registro-ciudadano  Alta de nuevo ciudadano.
 *    POST /api/login               Autenticación, retorna JWT.
 *
 *  Protegidas (token válido):
 *    GET  /api/blockchain          Cadena de bloques para auditoría.
 *    GET  /api/elecciones/activas  Lista de procesos electorales.
 *    POST /api/votar               Emisión de voto.
 *
 *  Solo Administrador (token + rol admin):
 *    GET  /api/padron              Padrón de ciudadanos registrados.
 *    POST /api/elecciones          Creación de nuevo proceso electoral.
 *    GET  /api/estadisticas-completo Panel de estadísticas con NLP y votos.
 */

const express = require('express');
const router = express.Router();

const { verificarToken, soloAdmin } = require('../middleware/auth');

const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');
const votacionController = require('../controllers/votacionController');

// --- Rutas Públicas (Transparencia y Acceso) ---
router.post('/registro-ciudadano', authController.registro);
router.post('/login', authController.login);
router.get('/blockchain', votacionController.obtenerBlockchain);
router.get('/elecciones/activas', votacionController.obtenerEleccionesActivas);
router.get('/estadisticas-completo', adminController.obtenerEstadisticasGlobales);

// --- Rutas Protegidas (Requieren Token) ---
router.get('/elecciones/mis-elecciones', verificarToken, votacionController.obtenerMisElecciones);
router.post('/votar', verificarToken, votacionController.emitirVoto);

// --- Rutas de Administrador ---
router.get('/padron', verificarToken, soloAdmin, adminController.obtenerPadron);
router.post('/elecciones', verificarToken, soloAdmin, adminController.crearEleccion);
router.put('/cambiar-rol', verificarToken, soloAdmin, adminController.cambiarRol);

module.exports = router;