const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();

const { Bloque, Blockchain } = require('./services/blockchain');
const Voto = require('./models/Voto'); // Importamos el modelo

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// Instancia global de nuestra Blockchain
let urnaElecciones = new Blockchain();

// CONEXIÓN Y SINCRONIZACIÓN
mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('🟢 Conectado exitosamente a MongoDB Atlas');
        
        // Sincronizar la memoria con la base de datos
        const votosEnDB = await Voto.find().sort({ index: 1 });

        if (votosEnDB.length > 0) {
            console.log(`📦 Cargando ${votosEnDB.length} bloques desde la nube...`);
            
            // 🛠️ LA SOLUCIÓN: Rehidratar los bloques perdidos
            urnaElecciones.chain = votosEnDB.map(doc => {
                // 1. Limpiamos el formato de Mongoose a un objeto Javascript normal
                const bloquePlano = doc.toObject();
                // 2. Le inyectamos mágicamente las funciones de la clase Bloque
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

// --- RUTAS API ---

app.get('/api/blockchain', (req, res) => {
    res.json({
        valida: urnaElecciones.validarCadena(),
        totalVotos: urnaElecciones.chain.length - 1,
        cadena: urnaElecciones.chain
    });
});

// Importamos el modelo de Ciudadano arriba de tu server.js
const Ciudadano = require('./models/Ciudadano');

// RUTA DE VOTACIÓN PROTEGIDA (RF007 + Seguridad)
app.post('/api/votar', async (req, res) => {
    const { ine, candidato } = req.body;

    // 1. Validaciones básicas
    if (!ine || !candidato) {
        return res.status(400).json({ error: 'Faltan datos (INE y Candidato son obligatorios)' });
    }

    try {
        // 2. BUSCAR AL CIUDADANO EN EL PADRÓN
        const votante = await Ciudadano.findOne({ ine: ine });

        if (!votante) {
            return res.status(404).json({ error: '❌ Ciudadano no encontrado en el padrón electoral.' });
        }

        // 3. REGLA DE ORO: Un solo voto por persona
        if (votante.haVotado) {
            return res.status(403).json({ error: '⚠️ Usted ya ha ejercido su derecho al voto. Acceso denegado.' });
        }

        // 4. SI TODO ESTÁ OK: GENERAMOS EL BLOQUE ANÓNIMO
        const folioAnonimo = crypto.randomUUID();
        const nuevoVotoBloque = new Bloque(urnaElecciones.chain.length, {
            folio: folioAnonimo,
            candidato: candidato
        });

        // 5. REGISTRAR EN BLOCKCHAIN Y MONGODB
        urnaElecciones.agregarBloque(nuevoVotoBloque);
        await new Voto(nuevoVotoBloque).save();

        // 6. ACTUALIZAR AL CIUDADANO (Marcar que ya votó)
        votante.haVotado = true;
        await votante.save();

        res.json({ 
            mensaje: '✅ Voto registrado y blindado exitosamente', 
            folio: folioAnonimo 
        });

    } catch (error) {
        res.status(500).json({ error: 'Error interno en el proceso de votación' });
    }
});

// --- RUTA TEMPORAL PARA EL SPRINT 1 ---
// Sirve para meter ciudadanos manualmente a la base de datos y poder probar
app.post('/api/registro-ciudadano', async (req, res) => {
    try {
        const nuevo = new Ciudadano(req.body);
        await nuevo.save();
        res.json({ mensaje: '✅ Ciudadano registrado en el padrón' });
    } catch (e) {
        res.status(400).json({ error: 'Error al registrar o ciudadano ya existe' });
    }
});

app.listen(PORT, () => console.log(`⚡ API activa en puerto ${PORT}`));