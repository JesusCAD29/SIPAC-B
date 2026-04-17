const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const { Bloque, Blockchain } = require('./services/blockchain');
const Voto = require('./models/Voto');

// Importamos el archivo de rutas maestro
const apiRoutes = require('./routes/api');

const app = express();
app.use(cors());
app.use(express.json());

// 🔗 CONEXIÓN AL FRONTEND
app.use(express.static(path.join(__dirname, '../frontend')));

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// Instancia global de nuestra Blockchain
let urnaElecciones = new Blockchain();
// Hacemos que la urna sea accesible desde cualquier controlador
app.locals.urnaElecciones = urnaElecciones; 

// 🚦 CONEXIÓN A LAS RUTAS (Toda la API pasa por aquí)
app.use('/api', apiRoutes);

// CONEXIÓN Y SINCRONIZACIÓN DE MONGODB
mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('🟢 Conectado exitosamente a MongoDB Atlas');

        const votosEnDB = await Voto.find().sort({ index: 1 });

        if (votosEnDB.length > 0) {
            console.log(`📦 Cargando ${votosEnDB.length} bloques desde la nube...`);
            urnaElecciones.chain = votosEnDB.map(doc => {
                const bloquePlano = doc.toObject();
                Object.setPrototypeOf(bloquePlano, Bloque.prototype);
                return bloquePlano;
            });
        } else {
            console.log('🌱 Base de datos vacía. Guardando Bloque Génesis...');
            const genesis = urnaElecciones.chain[0];
            await new Voto(genesis).save();
        }
    })
    .catch((err) => console.error('🔴 Error de BD:', err));

app.listen(PORT, () => console.log(`⚡ API activa en puerto ${PORT}`));