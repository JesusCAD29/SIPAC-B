/**
 * js/boleta.js
 * Lógica de la Urna Electrónica (dibujado de opciones, emisión de votos y conexión a Blockchain).
 */

// Catálogo Maestro de Partidos (Debe ser idéntico al del Admin)
const catalogoPartidos = [
    { id: 'PAN', nombre: 'Partido Acción Nacional (PAN)', colorHex: '#0055b8' },
    { id: 'PRI', nombre: 'Partido Revolucionario Institucional (PRI)', colorHex: '#da251d' },
    { id: 'PRD', nombre: 'Partido de la Revolución Democrática (PRD)', colorHex: '#ffcc00' },
    { id: 'PVEM', nombre: 'Partido Verde Ecologista de México (PVEM)', colorHex: '#4cb748' },
    { id: 'MC', nombre: 'Movimiento Ciudadano (MC)', colorHex: '#f18132' },
    { id: 'MORENA', nombre: 'Movimiento de Regeneración Nacional (MORENA)', colorHex: '#a60a3d' },
    { id: 'INDEP', nombre: 'Candidato independiente', colorHex: '#8b5cf6' }
];

// Variables globales de la sesión activa
let ineSesion = null;
let nombreSesion = null;
let opcionesVoto = [];

/**
 * Inicialización de la Boleta
 */
document.addEventListener('DOMContentLoaded', async () => {
    if (!verificarAccesoProtegido()) return;

    ineSesion = sessionStorage.getItem('sesion_ine');
    nombreSesion = sessionStorage.getItem('sesion_nombre');

    if (!ineSesion) {
        alert("Sesión expirada. Vuelve a iniciar sesión.");
        cerrarSesionGlobal();
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const eleccionId = urlParams.get('id');

    if (!eleccionId) {
        alert("⚠️ Error: No se indicó a qué elección pertenece esta boleta.");
        window.location.replace('/ciudadano.html');
        return;
    }

    try {
        const res = await fetchProtegido('/api/elecciones/activas');
        const elecciones = await res.json();
        const eleccion = elecciones.find(e => e._id === eleccionId);

        if (!eleccion) {
            alert("⚠️ Esta elección no existe o ya fue cerrada.");
            window.location.replace('/ciudadano.html');
            return;
        }

        opcionesVoto = eleccion.opciones;
        dibujarOpciones(opcionesVoto);

    } catch (err) {
        alert("❌ Error de conexión al cargar la boleta.");
        window.location.replace('/ciudadano.html');
        return;
    }

    let nombreMostrar = "CIUDADANO";
    if (nombreSesion) {
        nombreMostrar = nombreSesion.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    }
    document.getElementById('display-nombre').innerText = nombreMostrar;
    document.getElementById('display-ine').innerText = `ID: ${ineSesion}`;
});

/**
 * Renderiza una tarjeta por cada candidato usando el formato "Nombre (Partido)"
 * para asignar el diseño y color oficial desde el Catálogo.
 */
function dibujarOpciones(opciones) {
    const contenedor = document.getElementById('contenedor-opciones');
    contenedor.innerHTML = '';

    opciones.forEach((opcionTexto) => {
        let nombreCandidato = opcionTexto;
        let nombrePartido = "Independiente / Otro";
        let colorHex = '#475569'; // Color gris por defecto (slate-600)
        let logoTxt = '🗳️'; // Icono por defecto

        // 1. Extraer nombre y partido (Si viene en el formato "Nombre (Partido)")
        const match = opcionTexto.match(/^(.*?)\s*\((.*?)\)$/);
        if (match) {
            nombreCandidato = match[1].trim();
            nombrePartido = match[2].trim();
        }

        // 2. Buscar coincidencias en el Catálogo para asignar Color y Logo
        for (let p of catalogoPartidos) {
            if (nombrePartido.toUpperCase().includes(p.id)) {
                colorHex = p.colorHex;
                logoTxt = p.id;
                break;
            }
        }

        // 3. Renderizar la Tarjeta de Boleta Avanzada
        contenedor.innerHTML += `
            <label class="cursor-pointer group relative">
                <input type="radio" name="candidato" value="${opcionTexto}" class="peer hidden">
                
                <div class="h-full bg-[#1f2238] border-2 border-slate-700 rounded-xl p-5 flex flex-col items-center justify-center text-center transition-all peer-checked:border-emerald-500 peer-checked:bg-emerald-500/10 group-hover:border-slate-500">
                    
                    <div class="w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-transform group-hover:scale-105 peer-checked:scale-110" style="background-color: ${colorHex}; box-shadow: 0 10px 15px -3px ${colorHex}50;">
                        <span class="text-white font-black text-sm tracking-wider">${logoTxt}</span>
                    </div>
                    
                    <h3 class="font-bold text-slate-200 text-[15px] leading-tight mb-1">${nombreCandidato}</h3>
                    <p class="text-[9px] text-slate-400 uppercase tracking-widest font-medium">${nombrePartido}</p>
                    
                    <div class="absolute top-3 right-3 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center opacity-0 peer-checked:opacity-100 transition-all transform scale-50 peer-checked:scale-100 shadow-md">
                        <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>
                    </div>
                </div>
            </label>
        `;
    });
}

/** Alias local que delega el cierre de sesión a la función global. */
function cerrarSesion() {
    cerrarSesionGlobal();
}

/**
 * Envía el voto autenticado al servidor.
 */
async function emitirVoto() {
    const candidatoSeleccionado = document.querySelector('input[name="candidato"]:checked');
    const msgError = document.getElementById('msg-error');
    const btnVotar = document.getElementById('btn-votar');
    const propuestaTexto = document.getElementById('f-propuesta') ? document.getElementById('f-propuesta').value.trim() : "";

    const urlParams = new URLSearchParams(window.location.search);
    const eleccionIdActual = urlParams.get('id');

    if (!candidatoSeleccionado) {
        msgError.innerText = '⚠️ Por favor, selecciona tu voto antes de emitirlo.';
        msgError.classList.remove('hidden');
        return;
    }

    if (!eleccionIdActual) {
        msgError.innerText = '⚠️ Error fatal: No se detectó a qué elección pertenece esta boleta.';
        msgError.classList.remove('hidden');
        return;
    }

    msgError.classList.add('hidden');
    btnVotar.disabled = true;
    btnVotar.innerHTML = `<svg class="animate-spin h-5 w-5 text-white mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Encriptando y Blindando...`;

    try {
        const respuesta = await fetchProtegido('/api/votar', {
            method: 'POST',
            body: JSON.stringify({
                ine: ineSesion,
                candidato: candidatoSeleccionado.value, // Envía el string completo original
                propuesta: propuestaTexto,
                eleccionId: eleccionIdActual
            })
        });

        if (respuesta.status === 401 || respuesta.status === 403) {
            const datosError = await respuesta.json();
            throw new Error(datosError.error || "Token inválido o expirado.");
        }

        const datos = await respuesta.json();
        if (!respuesta.ok) throw new Error(datos.error);

        document.getElementById('urna-container').classList.add('hidden');
        document.getElementById('hash-voto').innerText = datos.folio;
        document.getElementById('pantalla-exito').classList.remove('hidden');

    } catch (error) {
        msgError.innerText = error.message;
        msgError.classList.remove('hidden');

        if (error.message.includes('Token') || error.message.includes('Autorización')) {
            setTimeout(() => cerrarSesionGlobal(), 2000);
        }

        btnVotar.disabled = false;
        btnVotar.innerHTML = `<svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg> <span>Emitir Voto Seguro</span>`;
    }
}