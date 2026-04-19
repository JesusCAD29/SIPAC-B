/**
 * services/blockchain.js — Implementación de la blockchain de urna electoral.
 *
 * Clases exportadas:
 *  - Bloque:     Unidad atómica de la cadena. Contiene datos de un voto,
 *                el hash del bloque anterior y su propio hash SHA-256.
 *  - Blockchain: Administra la cadena completa. Crea el Bloque Génesis,
 *                agrega nuevos bloques y valida la integridad de la cadena.
 *
 * Nota: La instancia de Blockchain vive en memoria (app.locals.urnaElecciones).
 * La persistencia se logra mediante el modelo Voto en MongoDB (ver server.js).
 */

const crypto = require('crypto');

/** Representa un bloque individual dentro de la cadena de votos. */
class Bloque {
    /**
     * @param {number} index         - Posición en la cadena (0 para Génesis).
     * @param {object} data          - Carga útil: { folio, candidato, eleccionId }.
     * @param {string} previousHash  - Hash del bloque anterior ('0' para Génesis).
     */
    constructor(index, data, previousHash = '') {
        this.index        = index;
        this.timestamp    = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
        this.data         = data;
        this.previousHash = previousHash;
        this.hash         = this.calcularHash();
    }

    /**
     * Calcula el hash SHA-256 de este bloque.
     * Cualquier cambio en index, timestamp, data o previousHash altera el hash,
     * lo que permite detectar manipulaciones durante la validación.
     *
     * @returns {string} Hash hexadecimal de 64 caracteres.
     */
    calcularHash() {
        const stringToHash = this.index + this.timestamp + JSON.stringify(this.data) + this.previousHash;
        return crypto.createHash('sha256').update(stringToHash).digest('hex');
    }
}

/** Administra la cadena de bloques y garantiza su integridad. */
class Blockchain {
    constructor() {
        // La cadena siempre comienza con el Bloque Génesis en index 0
        this.chain = [this.crearBloqueGenesis()];
    }

    /** Crea el bloque inicial fijo que ancla toda la cadena. */
    crearBloqueGenesis() {
        return new Bloque(0, { mensaje: "Bloque Génesis - Inicio de la Elección SIPAC-B" }, "0");
    }

    /** Retorna el último bloque insertado en la cadena. */
    obtenerUltimoBloque() {
        return this.chain[this.chain.length - 1];
    }

    /**
     * Agrega un nuevo bloque al final de la cadena.
     * Asigna el hash del bloque anterior y recalcula el hash del nuevo bloque
     * antes de insertarlo, manteniendo el encadenamiento criptográfico.
     *
     * @param {Bloque} nuevoBloque - Bloque ya construido (sin previousHash asignado).
     */
    agregarBloque(nuevoBloque) {
        nuevoBloque.previousHash = this.obtenerUltimoBloque().hash;
        nuevoBloque.hash         = nuevoBloque.calcularHash();
        this.chain.push(nuevoBloque);
    }

    /**
     * Recorre la cadena verificando que:
     *  1. El hash de cada bloque coincida con su contenido actual.
     *  2. El campo previousHash de cada bloque coincida con el hash del bloque anterior.
     *
     * @returns {boolean} true si la cadena es íntegra; false si fue manipulada.
     */
    validarCadena() {
        for (let i = 1; i < this.chain.length; i++) {
            const bloqueActual  = this.chain[i];
            const bloqueAnterior = this.chain[i - 1];

            if (bloqueActual.hash !== bloqueActual.calcularHash()) return false;
            if (bloqueActual.previousHash !== bloqueAnterior.hash)  return false;
        }
        return true;
    }
}

module.exports = { Bloque, Blockchain };