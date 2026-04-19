/**
 * server.js — Punto de entrada principal del backend Node.js.
 *
 * Responsabilidades:
 *  - Inicializar Express y sus middlewares (CORS, JSON, archivos estáticos).
 *  - Conectar a MongoDB Atlas y sincronizar la blockchain en memoria con los
 *    votos persistidos en la base de datos.
 *  - Crear la instancia global de la Blockchain y exponerla en app.locals
 *    para que todos los controladores la compartan.
 *  - Montar el router de la API bajo el prefijo /api.
 *  - Arrancar el servidor HTTP en el puerto configurado.
 */

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const { Bloque, Blockchain } = require('./services/blockchain');
const Voto = require('./models/Voto');

// Router maestro que agrupa todas las rutas de la API
const apiRoutes = require('./routes/api');

const app = express();
app.use(cors());
app.use(express.json());

// Sirve los archivos estáticos del frontend desde la carpeta /frontend
app.use(express.static(path.join(__dirname, '../frontend')));

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// Instancia única de la Blockchain compartida entre todos los controladores
let urnaElecciones = new Blockchain();
app.locals.urnaElecciones = urnaElecciones;

// Todas las peticiones HTTP a /api pasan por este router
app.use('/api', apiRoutes);

// Conexión a MongoDB: al conectar, reconstruye la cadena en memoria
mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('🟢 Conectado exitosamente a MongoDB Atlas');

        // Carga los bloques existentes ordenados por índice
        const votosEnDB = await Voto.find().sort({ index: 1 });

        if (votosEnDB.length > 0) {
            // Rehidrata cada documento de Mongo como instancia de Bloque
            // para que calcularHash() esté disponible en la cadena en memoria
            console.log(`📦 Cargando ${votosEnDB.length} bloques desde la nube...`);
            urnaElecciones.chain = votosEnDB.map(doc => {
                const bloquePlano = doc.toObject();
                Object.setPrototypeOf(bloquePlano, Bloque.prototype);
                return bloquePlano;
            });
        } else {
            // Primera ejecución: persiste el Bloque Génesis
            console.log('🌱 Base de datos vacía. Guardando Bloque Génesis...');
            const genesis = urnaElecciones.chain[0];
            await new Voto(genesis).save();
        }
    })
    .catch((err) => console.error('🔴 Error de BD:', err));

app.listen(PORT, () => console.log(`⚡ API activa en puerto ${PORT}`));