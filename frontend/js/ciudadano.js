/**
 * js/ciudadano.js
 * Lógica del panel principal del ciudadano (Dashboard).
 */

/**
 * Al cargar el DOM:
 * 1. Verifica que el token exista y el rol sea 'ciudadano' (redirige si no).
 * 2. Normaliza y muestra el nombre del ciudadano sin tildes en mayúsculas.
 * 3. Llama a cargarEleccionesReales() para poblar la grilla de elecciones.
 */
document.addEventListener('DOMContentLoaded', () => {
    if (!verificarAccesoProtegido('ciudadano')) return;

    const nombreSesion = sessionStorage.getItem('sesion_nombre');

    if (nombreSesion) {
        // Elimina diacríticos (tildes) y convierte a mayúsculas para uniformidad
        const nombreNormalizado = nombreSesion
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toUpperCase();

        document.getElementById('nombre-ciudadano').innerText = nombreNormalizado;
    }
    cargarEleccionesReales();
});

/**
 * cargarEleccionesReales — Consulta GET /api/elecciones/mis-elecciones con token.
 * Si el token expiró (401/403), cierra sesión automáticamente.
 * Renderiza una tarjeta por cada elección; el botón navega a boleta.html?id=<_id>.
 */
async function cargarEleccionesReales() {
    try {
        const res = await fetchProtegido('/api/elecciones/mis-elecciones');

        if (res.status === 401 || res.status === 403) {
            cerrarSesionGlobal();
            return;
        }

        const elecciones = await res.json();

        const contenedor = document.getElementById('contenedor-elecciones');
        contenedor.innerHTML = '';

        // UI de Participación Completada
        if (elecciones.length === 0) {
            contenedor.innerHTML = `
            <div class="col-span-full text-center py-12 px-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
                <div class="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg class="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 class="text-2xl font-bold text-slate-800 mb-2">¡Participación Completada!</h3>
                <p class="text-slate-500 mb-8 max-w-md mx-auto">Has ejercido tu derecho al voto en todos los procesos disponibles para tu región. Tus votos han sido blindados en la Blockchain.</p>
                
                <button onclick="cerrarSesionGlobal()" class="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-10 rounded-2xl transition shadow-xl active:scale-95">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7" />
                    </svg>
                    Finalizar y Cerrar Sesión
                </button>
            </div>
        `;
            return;
        }

        // Renderizar Tarjetas de Elección
        elecciones.forEach(el => {
            contenedor.innerHTML += `
                <div class="bg-white rounded-2xl shadow-sm hover:shadow-xl border border-slate-200 p-6 relative overflow-hidden transition-all duration-300 flex flex-col">
                    <div class="flex justify-between items-start mb-4">
                        <span class="bg-green-100 text-green-700 text-xs font-bold px-3 py-1.5 rounded-md uppercase tracking-wider">Abierta</span>
                        <svg class="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    
                    <h3 class="font-bold text-slate-800 text-xl md:text-2xl leading-tight mb-2">${el.titulo}</h3>
                    <p class="text-slate-500 text-sm md:text-base mb-8 leading-relaxed flex-grow">
                        ${el.descripcion}
                    </p>
                    
                    <button onclick="window.location.href='/boleta.html?id=${el._id}'" class="w-full bg-[#2563eb] hover:bg-blue-600 text-white font-bold py-4 rounded-xl shadow-md transition transform hover:-translate-y-0.5 active:scale-95">
                        Entrar a la Urna
                    </button>
                </div>
            `;
        });
    } catch (error) {
        document.getElementById('contenedor-elecciones').innerHTML = '<p class="text-red-500 font-bold p-4">Error al cargar los procesos electorales. Revise la conexión al servidor.</p>';
    }
}

/**
 * irABoleta — Alternativa de navegación que persiste las opciones en sessionStorage.
 */
function irABoleta(eleccionId, opcionesStr) {
    if (opcionesStr) sessionStorage.setItem('eleccion_opciones', opcionesStr);
    window.location.href = '/boleta.html';
}