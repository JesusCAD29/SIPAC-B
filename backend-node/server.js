const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config(); // Lee las variables del archivo .env

// Inicializar la aplicación
const app = express();

// Middlewares (Configuraciones base)
app.use(cors()); // Permite que el frontend se comunique sin bloqueos
app.use(express.json()); // Permite recibir datos en formato JSON

// Variables de entorno
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// Conexión a la Base de Datos
mongoose.connect(MONGO_URI)
    .then(() => console.log('🟢 Conectado exitosamente a MongoDB Atlas (SIPAC-B)'))
    .catch((err) => console.error('🔴 Error al conectar a la base de datos:', err));

// Ruta de prueba (Para verificar que el server está vivo)
app.get('/', (req, res) => {
    res.json({ mensaje: '🚀 API del servidor SIPAC-B V2.0 funcionando al 100%' });
});

// Levantar el servidor
app.listen(PORT, () => {
    console.log(`⚡ Servidor corriendo en http://localhost:${PORT}`);
});