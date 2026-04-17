// frontend/js/auth.js

// 1. Revisa si hay un token al cargar la página (Excepto en index.html y registro.html)
function verificarAccesoProtegido(rolRequerido = null) {
    const token = localStorage.getItem('sipac_token');
    const rolActual = sessionStorage.getItem('sesion_rol');

    if (!token) {
        // Lo patea de regreso al login
        window.location.replace('/');
        return false;
    }

    if (rolRequerido && rolActual !== rolRequerido) {
        // Intenta acceder a una página que no es de su rol
        alert("Acceso denegado. Privilegios insuficientes.");
        window.location.replace('/');
        return false;
    }
    return true;
}

// 2. Función para inyectar el Token en los fetch
function fetchProtegido(url, opciones = {}) {
    const token = localStorage.getItem('sipac_token');
    
    // Configura los headers estándar y agrega el Token
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    // Combina los headers con las opciones que mande el usuario
    opciones.headers = { ...opciones.headers, ...headers };

    return fetch(url, opciones);
}

// 3. Función unificada para cerrar sesión
function cerrarSesionGlobal() {
    localStorage.removeItem('sipac_token');
    sessionStorage.clear();
    window.location.replace('/');
}