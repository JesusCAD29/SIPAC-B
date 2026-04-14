const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');
const Eleccion = require('./models/Eleccion');
require('dotenv').config();

const { Bloque, Blockchain } = require('./services/blockchain');
const Voto = require('./models/Voto'); // Importamos el modelo

const app = express();
app.use(cors());
app.use(express.json());

// 🔗 CONEXIÓN AL FRONTEND: Le decimos a Node que busque los archivos web subiendo un nivel (..)
app.use(express.static(path.join(__dirname, '../frontend')));

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

// --- RUTA PARA CONSULTAR EL PADRÓN ELECTORAL (Solo Administración) ---
app.get('/api/padron', async (req, res) => {
    try {
        // Obtenemos todos los ciudadanos, pero ocultamos sus contraseñas por seguridad
        const ciudadanos = await Ciudadano.find().select('-password').sort({ fechaRegistro: -1 });
        res.json(ciudadanos);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los datos del padrón' });
    }
});

// --- RUTA DE AUTENTICACIÓN (LOGIN CON ROLES) ---
app.post('/api/login', async (req, res) => {
    const { identificador, password } = req.body;

    try {
        const usuario = await Ciudadano.findOne({ ine: identificador });

        if (!usuario) {
            return res.status(401).json({ error: '❌ Usuario no encontrado en el padrón.' });
        }

        if (usuario.password !== password) {
            return res.status(401).json({ error: '❌ Contraseña incorrecta.' });
        }

        // BIFURCACIÓN DE ROLES (RBAC)
        if (usuario.rol === 'admin') {
            // Es Administrador: Le damos pase directo al Panel Admin
            return res.json({
                mensaje: 'Acceso de Administrador',
                ine: usuario.ine,
                nombre: usuario.nombre,
                rol: usuario.rol,
                redirect: '/admin.html' // <-- Ruta de destino dinámica
            });
        } else {
            // Es Ciudadano: Revisamos si ya votó
            if (usuario.haVotado) {
                return res.status(403).json({ error: '⚠️ Ya has ejercido tu voto en este proceso electoral.' });
            }
            // Luz verde para votar
            return res.json({
                mensaje: 'Acceso Ciudadano',
                ine: usuario.ine,
                nombre: usuario.nombre,
                rol: usuario.rol,
                redirect: '/ciudadano.html' // <-- Ruta de destino dinámica
            });
        }

    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// --- RUTA: CREAR ELECCIÓN (Solo Admin) ---
app.post('/api/elecciones', async (req, res) => {
    try {
        const nuevaEleccion = new Eleccion({
            titulo: req.body.titulo,
            descripcion: req.body.descripcion,
            opciones: req.body.opciones
        });
        await nuevaEleccion.save();
        res.json({ mensaje: '✅ Proceso electoral creado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al crear la elección' });
    }
});

// --- RUTA: OBTENER ELECCIONES ACTIVAS ---
app.get('/api/elecciones/activas', async (req, res) => {
    try {
        const elecciones = await Eleccion.find({ activa: true });
        res.json(elecciones);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener elecciones' });
    }
});

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

// --- RUTA PARA DAR DE ALTA CIUDADANOS (OCR) ---
app.post('/api/registro-ciudadano', async (req, res) => {
    try {
        // 1. Verificamos que no exista ya en la base de datos
        const existe = await Ciudadano.findOne({ ine: req.body.ine });
        if (existe) {
            return res.status(400).json({ error: 'Esta Clave de Elector ya está registrada.' });
        }

        // 2. Lo guardamos en MongoDB (Ahora con contraseña)
        const nuevoCiudadano = new Ciudadano({
            nombre: req.body.nombre,
            ine: req.body.ine,
            password: req.body.password // <-- GUARDANDO LA CONTRASEÑA REAL
        });

        await nuevoCiudadano.save();
        res.json({ mensaje: '✅ Ciudadano registrado en el padrón' });

    } catch (error) {
        res.status(500).json({ error: 'Error del servidor al guardar el registro' });
    }
});

app.listen(PORT, () => console.log(`⚡ API activa en puerto ${PORT}`));