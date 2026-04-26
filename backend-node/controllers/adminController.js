/**
 * adminController.js — Controlador exclusivo para el rol Administrador.
 *
 * Exporta:
 *  - obtenerPadron:             Lista todos los ciudadanos registrados (sin contraseñas).
 *  - crearEleccion:             Crea un nuevo proceso electoral con sus opciones de candidatos.
 *  - obtenerAnaliticasNLP:      Retorna las propuestas ya clasificadas por la IA, agrupadas por categoría.
 *  - obtenerEstadisticasGlobales: Combina conteo de votos y análisis NLP, con filtro opcional por elección.
 *
 * Todas las rutas que usan este controlador están protegidas por verificarToken + soloAdmin.
 */

const Ciudadano = require('../models/Ciudadano');
const Eleccion = require('../models/Eleccion');
const Propuesta = require('../models/Propuesta');
const Voto = require('../models/Voto');

/**
 * GET /api/padron
 * Devuelve todos los ciudadanos ordenados por fecha de registro descendente.
 * Excluye el campo password de la respuesta.
 */
exports.obtenerPadron = async (req, res) => {
    try {
        const ciudadanos = await Ciudadano.find().select('-password').sort({ fechaRegistro: -1 });
        res.json(ciudadanos);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los datos del padrón' });
    }
};

/**
 * POST /api/elecciones
 * Crea y persiste un nuevo proceso electoral con restricciones de zona.
 * Body esperado: { titulo, descripcion, opciones: string[], cpPermitidos: string[] }
 */
exports.crearEleccion = async (req, res) => {
    try {
        const nuevaEleccion = new Eleccion({
            titulo: req.body.titulo,
            descripcion: req.body.descripcion,
            opciones: req.body.opciones,
            cpPermitidos: req.body.cpPermitidos || []
        });
        await nuevaEleccion.save();
        res.json({ mensaje: '✅ Proceso electoral creado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al crear la elección' });
    }
};

/**
 * GET /api/estadisticas-completo (uso legacy / NLP solo)
 * Retorna únicamente las propuestas ya procesadas por la IA,
 * junto con un objeto de conteo agrupado por categoría.
 */
exports.obtenerAnaliticasNLP = async (req, res) => {
    try {
        const propuestas = await Propuesta.find({ procesado: true }).sort({ fecha: -1 });

        // Agrupamos por categoría para alimentar gráficas tipo pastel/barras
        const conteoCategorias = {};
        propuestas.forEach(p => {
            const cat = p.categoriaIA;
            conteoCategorias[cat] = (conteoCategorias[cat] || 0) + 1;
        });

        res.json({ totales: conteoCategorias, listaPropuestas: propuestas });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener analíticas de IA' });
    }
};

/**
 * GET /api/estadisticas-completo?eleccionId=<id>
 * Devuelve votos y propuestas consolidados para el panel de administración.
 * Si se proporciona eleccionId en la query, filtra solo los datos de esa elección.
 *
 * Respuesta: { votos: { candidato: count }, ia: { categoría: count }, propuestas: [] }
 */
exports.obtenerEstadisticasGlobales = async (req, res) => {
    try {
        const { eleccionId } = req.query;

        // Filtros dinámicos: si no viene eleccionId, trae todo
        const filtroVotos = eleccionId ? { 'data.eleccionId': eleccionId } : {};
        const filtroPropuestas = eleccionId ? { procesado: true, eleccionId: eleccionId } : { procesado: true };

        const votos = await Voto.find(filtroVotos);
        const propuestas = await Propuesta.find(filtroPropuestas);

        // Conteo de votos por candidato (se omite el Bloque Génesis con index 0)
        const conteoVotos = {};
        votos.forEach(v => {
            if (v.index === 0) return;
            const can = v.data.candidato;
            conteoVotos[can] = (conteoVotos[can] || 0) + 1;
        });

        // Conteo de propuestas por categoría IA
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
/**
 * PUT /api/cambiar-rol
 * Cambia el rol de un usuario específico ('ciudadano' <-> 'admin')
 */
exports.cambiarRol = async (req, res) => {
    try {
        const { idUsuario, nuevoRol } = req.body;

        // Validación básica de seguridad
        if (!['admin', 'ciudadano'].includes(nuevoRol)) {
            return res.status(400).json({ error: 'Rol no válido' });
        }

        await Ciudadano.findByIdAndUpdate(idUsuario, { rol: nuevoRol });
        res.json({ mensaje: `Rol actualizado a ${nuevoRol.toUpperCase()}` });
    } catch (error) {
        res.status(500).json({ error: 'Error interno al cambiar el rol' });
    }
};