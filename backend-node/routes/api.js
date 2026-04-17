const express = require('express');
const router = express.Router();

// Middlewares
const { verificarToken, soloAdmin } = require('../middleware/auth');

// Controladores
const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');
const votacionController = require('../controllers/votacionController');

// --- Rutas Públicas ---
router.post('/registro-ciudadano', authController.registro);
router.post('/login', authController.login);

// --- Rutas Protegidas (Requieren Token) ---
router.get('/blockchain', verificarToken, votacionController.obtenerBlockchain);
router.get('/elecciones/activas', verificarToken, votacionController.obtenerEleccionesActivas);
router.post('/votar', verificarToken, votacionController.emitirVoto);

// --- Rutas de Administrador ---
router.get('/padron', verificarToken, soloAdmin, adminController.obtenerPadron);
router.post('/elecciones', verificarToken, soloAdmin, adminController.crearEleccion);

module.exports = router;