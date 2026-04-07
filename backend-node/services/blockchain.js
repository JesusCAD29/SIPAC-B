const crypto = require('crypto');

// 1. EL MOLDE DEL BLOQUE (Lo que hicimos antes)
class Bloque {
    constructor(index, data, previousHash = '') {
        this.index = index;
        this.timestamp = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
        this.data = data; 
        this.previousHash = previousHash;
        this.hash = this.calcularHash();
    }

    calcularHash() {
        const stringToHash = this.index + this.timestamp + JSON.stringify(this.data) + this.previousHash;
        return crypto.createHash('sha256').update(stringToHash).digest('hex');
    }
}

// 2. LA CADENA DE BLOQUES (El administrador de la red)
class Blockchain {
    constructor() {
        // Al nacer, la blockchain debe tener un "Bloque Génesis" obligatorio
        this.chain = [this.crearBloqueGenesis()];
    }

    crearBloqueGenesis() {
        return new Bloque(0, { mensaje: "Bloque Génesis - Inicio de la Elección SIPAC-B" }, "0");
    }

    obtenerUltimoBloque() {
        return this.chain[this.chain.length - 1];
    }

    // Método principal para registrar un voto (RF007)
    agregarBloque(nuevoBloque) {
        // Le decimos a este nuevo bloque cuál es la firma del bloque anterior
        nuevoBloque.previousHash = this.obtenerUltimoBloque().hash;
        // Recalculamos su propia firma ahora que ya sabe quién es su antecesor
        nuevoBloque.hash = nuevoBloque.calcularHash();
        // Lo metemos a la cadena
        this.chain.push(nuevoBloque);
    }

    // Método de auditoría: Verifica que nadie haya hackeado los votos
    validarCadena() {
        for (let i = 1; i < this.chain.length; i++) {
            const bloqueActual = this.chain[i];
            const bloqueAnterior = this.chain[i - 1];

            // ¿Alguien modificó los datos de este bloque?
            if (bloqueActual.hash !== bloqueActual.calcularHash()) {
                return false;
            }
            // ¿Alguien rompió la conexión con el bloque anterior?
            if (bloqueActual.previousHash !== bloqueAnterior.hash) {
                return false;
            }
        }
        return true;
    }
}

module.exports = { Bloque, Blockchain };