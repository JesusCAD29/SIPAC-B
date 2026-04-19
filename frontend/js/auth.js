/**
 * frontend/js/auth.js — Utilidades de autenticación para el lado del cliente.
 *
 * Este archivo debe incluirse en todas las páginas protegidas (admin.html,
 * ciudadano.html, boleta.html, observador.html) ANTES de los scripts de página.
 *
 * Exporta (como funciones globales):
 *  - verificarAccesoProtegido(rolRequerido?) — Redirige al login si no hay token
 *    o si el rol del usuario no coincide con el requerido.
 *  - fetchProtegido(url, opciones?)          — Wrapper de fetch que inyecta el
 *    header Authorization: Bearer <token> automáticamente.
 *  - cerrarSesionGlobal()                    — Limpia storage y redirige al login.
 *
 * Almacenamiento:
 *  - localStorage:   'sipac_token'  → JWT con vida de 8h.
 *  - sessionStorage: 'sesion_rol'   → Rol del usuario ('ciudadano' | 'admin').
 */

/**
 * Protege páginas que requieren sesión activa.
 * Llamar al inicio de cada página protegida: verificarAccesoProtegido('admin').
 *
 * @param {string|null} rolRequerido - 'admin' | 'ciudadano' | null (solo verifica token).
 * @returns {boolean} true si el acceso es válido; false si redirigió.
 */
function verificarAccesoProtegido(rolRequerido = null) {
    const token    = localStorage.getItem('sipac_token');
    const rolActual = sessionStorage.getItem('sesion_rol');

    if (!token) {
        window.location.replace('/');
        return false;
    }

    if (rolRequerido && rolActual !== rolRequerido) {
        alert("Acceso denegado. Privilegios insuficientes.");
        window.location.replace('/');
        return false;
    }
    return true;
}

/**
 * Wrapper de fetch que agrega el JWT en el header Authorization.
 * Usar en lugar de fetch() para todas las llamadas a rutas protegidas.
 *
 * @param {string} url        - Endpoint de la API (ej. '/api/blockchain').
 * @param {object} opciones   - Opciones estándar de fetch (method, body, etc.).
 * @returns {Promise<Response>}
 */
function fetchProtegido(url, opciones = {}) {
    const token = localStorage.getItem('sipac_token');

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    // Merge: los headers del caller no sobreescriben Authorization
    opciones.headers = { ...opciones.headers, ...headers };

    return fetch(url, opciones);
}

/**
 * Cierra la sesión eliminando el token y el rol del storage,
 * luego redirige al usuario a la página de login (index.html).
 */
function cerrarSesionGlobal() {
    localStorage.removeItem('sipac_token');
    sessionStorage.clear();
    window.location.replace('/');
}