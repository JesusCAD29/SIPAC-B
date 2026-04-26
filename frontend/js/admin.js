/**
 * js/admin.js
 * Lógica del panel de administración: Control de elecciones, padrón y mapa de calor.
 */

// Variables globales para el mapa
let mapaIniciado = false;
let mapa;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Verificamos que sea un admin válido
    if (!verificarAccesoProtegido('admin')) return;

    // 2. Cargamos los datos iniciales
    cargarPadron();
    asignarCPsPorRegion();
});

/**
 * Lógica para cambiar entre las pestañas superiores en el panel Admin.
 */
function cambiarPestaña(tab) {
    // 1. Ocultar todas las secciones
    const secciones = ['tab-padron', 'tab-elecciones', 'tab-gestion'];
    secciones.forEach(s => {
        const el = document.getElementById(s);
        if (el) { el.classList.add('hidden'); el.classList.remove('block'); }
    });

    // 2. Reiniciar estilos de botones
    const botones = ['btn-tab-padron', 'btn-tab-elecciones', 'btn-tab-gestion'];
    const claseInactiva = "pb-3 border-b-2 border-transparent text-slate-400 hover:text-slate-200 font-bold transition-all flex items-center gap-2";
    const claseActiva = "pb-3 border-b-2 border-indigo-500 text-indigo-400 font-bold transition-all flex items-center gap-2";

    botones.forEach(b => {
        const el = document.getElementById(b);
        if (el) el.className = claseInactiva;
    });

    // 3. Activar la seleccionada
    document.getElementById(`tab-${tab}`).classList.remove('hidden');
    document.getElementById(`tab-${tab}`).classList.add('block');
    document.getElementById(`btn-tab-${tab}`).className = claseActiva;

    // 4. Acciones específicas por pestaña
    if (tab === 'padron' && mapa) {
        setTimeout(() => mapa.invalidateSize(), 100);
        cargarPadron();
    }
    if (tab === 'gestion') {
        cargarEleccionesGestion();
    }
}

/**
 * Traduce la selección amigable del admin a los CPs exactos que requiere el backend.
 */
function asignarCPsPorRegion() {
    const region = document.getElementById('el-region').value;
    const inputCP = document.getElementById('el-cp');
    const textoAyuda = document.getElementById('texto-region');

    const diccionarioRegiones = {
        "nacional": {
            cps: "",
            desc: "🌍 Disponible para todos los ciudadanos (Sin restricción)."
        },
        "hidalgo": {
            cps: "42,43",
            desc: "📍 Disponible a nivel estatal (Hidalgo)."
        },
        "pachuca": {
            cps: "420,421",
            desc: "🏙️ Elección municipal exclusiva para Pachuca."
        },
        "tizayuca": {
            cps: "438",
            desc: "🏭 Elección municipal exclusiva para Tizayuca."
        },
        "tulancingo": {
            cps: "436",
            desc: "📡 Elección municipal exclusiva para Tulancingo."
        }
    };
    if (region === "personalizado") {
        inputCP.classList.remove("hidden");
        inputCP.value = "";
        textoAyuda.innerText = "✍️ Ingresa los códigos postales separados por coma.";
    } else {
        inputCP.classList.add("hidden");
        inputCP.value = diccionarioRegiones[region].cps;
        textoAyuda.innerText = diccionarioRegiones[region].desc;
    }
}

/**
 * Llama a la API para cambiar el rol de un usuario y recarga la tabla.
 */
async function cambiarRolUsuario(idUsuario, nuevoRol) {
    if (!confirm(`¿Estás seguro de cambiar el rol a ${nuevoRol.toUpperCase()}?`)) return;

    try {
        const respuesta = await fetchProtegido('/api/cambiar-rol', {
            method: 'PUT',
            body: JSON.stringify({ idUsuario, nuevoRol })
        });

        if (respuesta.ok) {
            cargarPadron();
        } else {
            alert("❌ Error al cambiar el rol.");
        }
    } catch (error) {
        console.error(error);
        alert("❌ Error de conexión al servidor.");
    }
}

/**
 * Publica un nuevo proceso electoral recolectando los datos de los 3 pasos.
 */
async function crearEleccion() {
    // Datos Paso 1
    const titulo = document.getElementById('el-titulo').value.trim();
    const desc = document.getElementById('el-desc').value.trim();
    const cpStr = document.getElementById('el-cp').value.trim();

    // Datos Paso 2 (Candidatos)
    const tarjetas = document.querySelectorAll('.cand-card');
    const opciones = [];

    tarjetas.forEach(tarjeta => {
        const nombre = tarjeta.querySelector('.cand-nombre').value.trim();
        const partidoId = tarjeta.querySelector('.cand-partido').value;
        if (nombre && partidoId) {
            const partidoData = catalogoPartidos.find(p => p.id === partidoId);
            const nombrePartido = partidoData ? partidoData.nombre : partidoId;
            opciones.push(`${nombre} (${nombrePartido})`);
        }
    });

    // Validaciones Finales de Seguridad
    if (!titulo || !desc) {
        alert("⚠️ Falta título o descripción en el Paso 1.");
        editarPaso(1);
        return;
    }
    if (opciones.length < 2) {
        alert("⚠️ Asegura al menos 2 candidatos válidos en el Paso 2.");
        editarPaso(2);
        return;
    }

    const cpPermitidos = cpStr ? cpStr.split(',').map(c => c.trim()) : [];

    const btn = document.getElementById('btn-crear-eleccion');
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = `<span class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span> Publicando...`;
    btn.disabled = true;

    try {
        const respuesta = await fetchProtegido('/api/elecciones', {
            method: 'POST',
            body: JSON.stringify({
                titulo,
                descripcion: desc,
                opciones,
                cpPermitidos
            })
        });

        if (respuesta.status === 401 || respuesta.status === 403) {
            cerrarSesionGlobal(); return;
        }

        if (respuesta.ok) {
            alert("✅ ¡Proceso electoral publicado exitosamente en SIPAC-B!");

            // Reiniciar Wizard completo para crear otra
            document.getElementById('el-titulo').value = '';
            document.getElementById('el-desc').value = '';
            document.getElementById('el-region').value = 'nacional';
            document.getElementById('el-fecha-inicio').value = '';
            document.getElementById('el-fecha-cierre').value = '';

            const containerCand = document.getElementById('contenedor-candidatos');
            containerCand.innerHTML = '';
            agregarCandidatoUI();
            agregarCandidatoUI();

            editarPaso(1); // Regresamos al paso 1
            if (typeof cargarEleccionesGestion === 'function') cargarEleccionesGestion(); // Refresca la tabla de gestión si existe

        } else {
            alert("❌ Ocurrió un error al guardar la elección.");
        }
    } catch (error) {
        alert("❌ Error de conexión con el servidor.");
    } finally {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
}
/**
 * Agrega un nuevo campo de texto para un candidato en la UI
 */
function agregarOpcionUi() {
    const container = document.getElementById('contenedor-opciones');
    const div = document.createElement('div');
    div.className = 'flex gap-2 animate-fade-in';
    div.innerHTML = `
        <input type="text" class="opcion-input w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white outline-none focus:border-indigo-500 transition" placeholder="Nuevo candidato">
        <button type="button" onclick="this.parentElement.remove()" class="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white px-3.5 rounded-lg transition border border-red-500/20" title="Eliminar opción">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
    `;
    container.appendChild(div);
}

/**
 * Obtiene el padrón, actualiza la UI y pinta el mapa de calor.
 */
async function cargarPadron() {
    try {
        const respuesta = await fetchProtegido('/api/padron');

        if (respuesta.status === 401 || respuesta.status === 403) {
            cerrarSesionGlobal(); return;
        }

        const ciudadanos = await respuesta.json();
        const tabla = document.getElementById('tabla-usuarios');
        tabla.innerHTML = '';

        let totalVotaron = 0;
        let puntosCalor = [];

        // Construye la tabla de ciudadanos y acumula estadísticas de participación
        ciudadanos.forEach(c => {
            if (c.haVotado) totalVotaron++;

            if (c.coordenadas && c.coordenadas.lat && c.coordenadas.lng) {
                puntosCalor.push([c.coordenadas.lat, c.coordenadas.lng, 1]);
            }

            const fecha = new Date(c.fechaRegistro).toLocaleDateString('es-MX', {
                year: 'numeric', month: 'short', day: 'numeric'
            });

            tabla.innerHTML += `
                <tr class="hover:bg-slate-700/30 transition">
                    <td class="px-6 py-4 font-bold text-slate-200">${c.nombre}</td>
                    <td class="px-6 py-4 font-mono text-xs text-indigo-300">${c.ine}</td>
                    <td class="px-6 py-4 text-center">
                        ${c.haVotado
                    ? '<span class="px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-[10px] font-bold border border-green-500/20">VOTÓ</span>'
                    : '<span class="px-3 py-1 bg-yellow-500/10 text-yellow-500 rounded-full text-[10px] font-bold border border-yellow-500/20">PENDIENTE</span>'}
                    </td>
                    <td class="px-6 py-4 text-center">
                        <button onclick="cambiarRolUsuario('${c._id}', '${c.rol === 'admin' ? 'ciudadano' : 'admin'}')" 
                            class="text-[10px] font-black px-3 py-1 rounded-full border transition-all ${c.rol === 'admin' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40 hover:bg-slate-700' : 'bg-slate-800 text-slate-400 border-slate-600 hover:bg-indigo-500/20'}">
                            ${c.rol.toUpperCase()}
                        </button>
                    </td>
                    <td class="px-6 py-4 text-right text-xs text-slate-500">${fecha}</td>
                </tr>
            `;
        });

        // Actualiza KPIs
        document.getElementById('stat-total').innerText = ciudadanos.length;
        document.getElementById('stat-votaron').innerText = totalVotaron;
        document.getElementById('stat-porcentaje').innerText = ciudadanos.length > 0
            ? Math.round((totalVotaron / ciudadanos.length) * 100) + '%'
            : '0%';

        // Mapa de calor
        if (!mapaIniciado) {
            mapa = L.map('mapa-calor').setView([20.1011, -98.7591], 12);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 18
            }).addTo(mapa);
            mapaIniciado = true;
        }

        mapa.eachLayer((layer) => {
            if (layer.options && layer.options.blur) mapa.removeLayer(layer);
        });

        if (puntosCalor.length > 0) {
            L.heatLayer(puntosCalor, {
                radius: 25,
                blur: 15,
                maxZoom: 14,
                gradient: { 0.4: 'blue', 0.6: 'lime', 0.8: 'yellow', 1.0: 'red' }
            }).addTo(mapa);
        }

    } catch (error) {
        console.error("Error de conexión:", error);
    }
}

/**
 * Carga la lista de TODAS las elecciones para poder administrarlas.
 */
async function cargarEleccionesGestion() {
    try {
        // Consulta la ruta exclusiva del admin que retorna TODAS las elecciones (activas y pausadas)
        const res = await fetchProtegido('/api/elecciones/todas');
        const elecciones = await res.json();
        const tabla = document.getElementById('tabla-gestion-elecciones');

        tabla.innerHTML = '';

        if (elecciones.length === 0) {
            tabla.innerHTML = '<tr><td colspan="4" class="px-6 py-8 text-center text-slate-500">No hay procesos registrados.</td></tr>';
            return;
        }

        elecciones.forEach(el => {
            const regionTexto = (!el.cpPermitidos || el.cpPermitidos.length === 0) ? '🌍 Nacional' : `📍 CPs: ${el.cpPermitidos.join(', ')}`;

            // Colores y textos dinámicos según el estado
            const estadoClass = el.activa ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            const estadoTexto = el.activa ? 'ACTIVA' : 'PAUSADA';

            // Ícono dinámico: Pausa (si está activa) o Play (si está pausada)
            const iconoPausa = el.activa
                ? `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`
                : `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;

            tabla.innerHTML += `
                <tr class="hover:bg-slate-700/30 transition group">
                    <td class="px-6 py-4">
                        <p class="font-bold text-slate-200">${el.titulo}</p>
                        <p class="text-[10px] text-slate-500 truncate max-w-xs">${el.descripcion}</p>
                    </td>
                    <td class="px-6 py-4">
                        <span class="text-xs font-mono text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded">${regionTexto}</span>
                    </td>
                    <td class="px-6 py-4 text-center">
                        <span class="px-3 py-1 rounded-full text-[10px] font-bold border ${estadoClass}">
                            ${estadoTexto}
                        </span>
                    </td>
                    <td class="px-6 py-4 text-right">
                        <div class="flex justify-end gap-2">
                            <button onclick="toggleEstadoEleccion('${el._id}')" title="${el.activa ? 'Pausar Elección' : 'Reanudar Elección'}" class="p-2 text-yellow-400/80 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition">
                                ${iconoPausa}
                            </button>
                            <button onclick="abrirModalEdicion('${el._id}', \`${el.titulo.replace(/`/g, '')}\`, \`${el.descripcion.replace(/`/g, '')}\`)" title="Editar información" class="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition">
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button onclick="eliminarEleccion('${el._id}')" title="Eliminar Definitivamente" class="p-2 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition">
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
    } catch (e) {
        console.error("Error cargando gestión:", e);
    }
}

/**
 * Llama a la API para pausar o reanudar una elección.
 */
async function toggleEstadoEleccion(id) {
    try {
        const res = await fetchProtegido(`/api/elecciones/${id}/estado`, { method: 'PUT' });
        if (res.ok) {
            cargarEleccionesGestion(); // Recargar la tabla
        } else {
            alert("Error al cambiar el estado de la elección.");
        }
    } catch (e) {
        alert("Error de conexión.");
    }
}

/**
 * Elimina permanentemente una elección tras una doble confirmación.
 */
async function eliminarEleccion(id) {
    // Doble confirmación por seguridad
    if (!confirm("⚠️ ADVERTENCIA: ¿Estás seguro de ELIMINAR esta elección?")) return;
    if (!confirm("Esta acción es irreversible y se borrará de la base de datos. ¿Continuar?")) return;

    try {
        const res = await fetchProtegido(`/api/elecciones/${id}`, { method: 'DELETE' });
        if (res.ok) {
            cargarEleccionesGestion(); // Recargar la tabla visualmente
        } else {
            alert("❌ Error al intentar eliminar la elección.");
        }
    } catch (e) {
        alert("❌ Error de conexión al servidor.");
    }
}

/**
 * Funciones del Modal de Edición
 */
function abrirModalEdicion(id, titulo, descripcion) {
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-titulo').value = titulo;
    document.getElementById('edit-desc').value = descripcion;
    document.getElementById('modal-editar').classList.remove('hidden');
}

function cerrarModalEdicion() {
    document.getElementById('modal-editar').classList.add('hidden');
}

/**
 * Envía los datos editados al servidor.
 */
async function guardarEdicion() {
    const id = document.getElementById('edit-id').value;
    const titulo = document.getElementById('edit-titulo').value.trim();
    const descripcion = document.getElementById('edit-desc').value.trim();

    if (!titulo || !descripcion) {
        alert("El título y la descripción no pueden estar vacíos.");
        return;
    }

    const btn = document.getElementById('btn-guardar-edicion');
    const txtOriginal = btn.innerText;
    btn.innerText = "Guardando...";
    btn.disabled = true;

    try {
        const res = await fetchProtegido(`/api/elecciones/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ titulo, descripcion })
        });

        if (res.ok) {
            cerrarModalEdicion();
            cargarEleccionesGestion(); // Recargar la tabla para ver los cambios
        } else {
            alert("Error al guardar los cambios.");
        }
    } catch (e) {
        alert("Error de conexión al servidor.");
    } finally {
        btn.innerText = txtOriginal;
        btn.disabled = false;
    }
}

/**
 * Función (placeholder) para la lógica de dar de baja.
 */
async function darDeBajaEleccion(id) {
    if (!confirm("¿Estás seguro de finalizar este proceso electoral? Los ciudadanos ya no podrán votar en él.")) return;
    alert("Función de Backend necesaria: Aquí llamaríamos a un endpoint de DELETE o UPDATE.");
}

// ==========================================
// LÓGICA DEL WIZARD (CREACIÓN DE ELECCIONES)
// ==========================================

let pasoActualWizard = 1;

/**
 * Valida los datos del Paso 1 y avanza al Paso 2
 */
function validarYContinuarPaso1() {
    const titulo = document.getElementById('el-titulo').value.trim();
    const desc = document.getElementById('el-desc').value.trim();
    const region = document.getElementById('el-region');
    const regionTexto = region.options[region.selectedIndex].text;

    if (!titulo || !desc) {
        alert("⚠️ Por favor, ingresa el título y la descripción oficial.");
        return;
    }

    // 1. Actualizar el texto del Summary (ej. "Elección 2026 · Municipio: Tulancingo")
    document.getElementById('summary-text-1').innerText = `${titulo} · ${regionTexto}`;

    // 2. Ocultar formulario Paso 1 y mostrar su Summary
    document.getElementById('form-paso-1').classList.add('hidden');
    document.getElementById('summary-paso-1').classList.remove('hidden');

    // 3. Mostrar el formulario del Paso 2
    document.getElementById('form-paso-2').classList.remove('hidden');

    // 4. Actualizar Sidebar UI (Paso 1 completado, Paso 2 activo)
    actualizarSidebarWizard(2);
}

/**
 * Navegación hacia atrás (Botones "Editar" o "Volver")
 * Maneja qué resúmenes y formularios ocultar/mostrar según el paso destino.
 */
function editarPaso(pasoDestino) {
    // Ocultar todos los formularios primero
    document.getElementById('form-paso-1').classList.add('hidden');
    document.getElementById('form-paso-2').classList.add('hidden');
    document.getElementById('form-paso-3').classList.add('hidden');

    if (pasoDestino === 1) {
        document.getElementById('summary-paso-1').classList.add('hidden');
        document.getElementById('summary-paso-2').classList.add('hidden');
        document.getElementById('form-paso-1').classList.remove('hidden');
    }
    else if (pasoDestino === 2) {
        document.getElementById('summary-paso-1').classList.remove('hidden'); // El 1 ya está completo
        document.getElementById('summary-paso-2').classList.add('hidden');    // Ocultamos el summary del 2
        document.getElementById('form-paso-2').classList.remove('hidden');    // Abrimos el form del 2
    }

    actualizarSidebarWizard(pasoDestino);
}

/**
 * Actualiza los colores del menú izquierdo según el paso actual
 */
function actualizarSidebarWizard(pasoActivo) {
    pasoActualWizard = pasoActivo;

    // Resetear todos
    for (let i = 1; i <= 3; i++) {
        const nav = document.getElementById(`nav-step-${i}`);
        const icon = document.getElementById(`icon-step-${i}`);
        const title = nav.querySelector('h4');

        nav.classList.add('opacity-50');
        icon.className = "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-slate-800 text-slate-500 border border-slate-700 ring-4 ring-slate-900 transition-colors";
        title.className = "font-bold text-slate-400 text-sm transition-colors";

        // Estilo para pasos completados o activos
        if (i <= pasoActivo) {
            nav.classList.remove('opacity-50');
            icon.className = "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 ring-4 ring-slate-900 transition-colors";
            title.className = "font-bold text-emerald-400 text-sm transition-colors";
        }

        // Si el paso ya se pasó (ej. estamos en el 2, el 1 se marca con palomita)
        if (i < pasoActivo) {
            icon.innerHTML = `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>`;
        } else {
            icon.innerHTML = i;
        }
    }
}

// ==========================================
// PASO 2: GESTIÓN CENTRALIZADA DE CANDIDATOS
// ==========================================

// Catálogo Maestro de Partidos (Mapeo de UI y Datos)
const catalogoPartidos = [
    { id: 'PAN', nombre: 'Partido Acción Nacional (PAN)', colorHex: '#0055b8' },
    { id: 'PRI', nombre: 'Partido Revolucionario Institucional (PRI)', colorHex: '#da251d' },
    { id: 'PRD', nombre: 'Partido de la Revolución Democrática (PRD)', colorHex: '#ffcc00' },
    { id: 'PVEM', nombre: 'Partido Verde Ecologista de México (PVEM)', colorHex: '#4cb748' },
    { id: 'MC', nombre: 'Movimiento Ciudadano (MC)', colorHex: '#f18132' },
    { id: 'MORENA', nombre: 'Movimiento de Regeneración Nacional (MORENA)', colorHex: '#a60a3d' },
    { id: 'INDEP', nombre: 'Candidato independiente', colorHex: '#8b5cf6' }
];

let contadorCandidatos = 0;

/**
 * Inyecta una nueva tarjeta de candidato idéntica al diseño del UI.
 */
function agregarCandidatoUI() {
    contadorCandidatos++;
    const id = contadorCandidatos;
    const container = document.getElementById('contenedor-candidatos');

    // Generar opciones del Select
    let opcionesSelect = '<option value="">— Seleccionar partido —</option>';
    catalogoPartidos.forEach(p => {
        opcionesSelect += `<option value="${p.id}">${p.nombre}</option>`;
    });

    // Generar los círculos de colores basados en el catálogo
    let circulosColores = '';
    catalogoPartidos.forEach(p => {
        circulosColores += `<div id="dot-${id}-${p.id}" class="w-5 h-5 rounded-full border-2 border-slate-800 transition-all opacity-40 grayscale" style="background-color: ${p.colorHex};"></div>`;
    });

    const div = document.createElement('div');
    div.className = 'cand-card bg-[#161827] border border-slate-700/80 rounded-xl p-5 relative border-l-2 border-l-emerald-500 animate-fade-in group shadow-sm';

    div.innerHTML = `
        <div class="flex justify-between items-center mb-5">
            <span class="text-[10px] text-slate-500 uppercase tracking-widest font-bold flex items-center gap-2">
                <span class="inline-flex w-5 h-5 border border-slate-600 rounded-full items-center justify-center text-[9px] text-slate-400">${id}</span> 
                CANDIDATO / PLANILLA
            </span>
            <button type="button" onclick="this.closest('.cand-card').remove()" class="text-slate-500 hover:text-red-400 transition" title="Eliminar candidato">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div class="lg:col-span-9 space-y-5">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Nombre del Candidato o Planilla <span class="text-red-500">*</span></label>
                        <input type="text" class="cand-nombre w-full bg-[#0f111a] border border-slate-700 rounded-lg px-4 py-2.5 text-white outline-none focus:border-indigo-500 transition text-sm" placeholder="Ej. María González Ruiz">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Número de Boleta</label>
                        <input type="text" class="w-full bg-[#0f111a] border border-slate-700 rounded-lg px-4 py-2.5 text-white outline-none focus:border-indigo-500 transition text-sm" placeholder="Ej. 001">
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Partido Político <span class="text-red-500">*</span></label>
                        <select onchange="actualizarPartido(${id}, this)" class="cand-partido w-full bg-[#0f111a] border border-slate-700 rounded-lg px-4 py-2.5 text-white outline-none focus:border-indigo-500 transition text-sm appearance-none cursor-pointer">
                            ${opcionesSelect}
                        </select>
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Color Representativo</label>
                        <div class="flex items-center gap-1.5 pt-1.5">
                            ${circulosColores}
                        </div>
                    </div>
                </div>

                <div>
                    <label class="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Eslogan o propuesta breve <span class="text-slate-500 lowercase normal-case">(opcional)</span></label>
                    <input type="text" class="w-full bg-[#0f111a] border border-slate-700 rounded-lg px-4 py-2.5 text-slate-300 outline-none focus:border-indigo-500 transition text-sm" placeholder="Ej. 'El cambio verdadero'">
                </div>
            </div>

            <div class="lg:col-span-3 flex flex-col items-center justify-center lg:border-l border-slate-700/50 pt-4 lg:pt-0">
                <label class="block text-[10px] font-bold text-slate-500 mb-3 uppercase text-center">Logo / Escudo</label>
                <div id="logo-box-${id}" class="w-24 h-24 border border-dashed border-slate-600 rounded-xl flex items-center justify-center text-slate-500 bg-[#0f111a] transition-all relative overflow-hidden">
                    <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <p class="text-[9px] text-indigo-400/70 text-center mt-3 leading-tight max-w-[120px]">Asignación automática desde DB Central</p>
            </div>
        </div>
    `;
    container.appendChild(div);
}

/**
 * Cuando se elige un partido, actualiza el color y simula la carga del logo.
 */
function actualizarPartido(idTarjeta, selectElement) {
    const partidoId = selectElement.value;

    // 1. Resetear todos los colores (hacerlos grises)
    catalogoPartidos.forEach(p => {
        const dot = document.getElementById(`dot-${idTarjeta}-${p.id}`);
        if (dot) {
            dot.classList.add('opacity-40', 'grayscale');
            dot.classList.remove('ring-2', 'ring-white', 'scale-125', 'z-10');
        }
    });

    const logoBox = document.getElementById(`logo-box-${idTarjeta}`);

    if (!partidoId) {
        logoBox.innerHTML = `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>`;
        logoBox.style.backgroundColor = '#0f111a';
        logoBox.style.borderColor = '#475569';
        return;
    }

    // 2. Resaltar el color seleccionado
    const dotSelected = document.getElementById(`dot-${idTarjeta}-${partidoId}`);
    if (dotSelected) {
        dotSelected.classList.remove('opacity-40', 'grayscale');
        dotSelected.classList.add('ring-2', 'ring-white', 'scale-125', 'z-10');
    }

    // 3. Simular previsualización del logo centralizado
    const partidoData = catalogoPartidos.find(p => p.id === partidoId);
    logoBox.innerHTML = `<span class="font-black text-white text-xl">${partidoId}</span>`;
    logoBox.style.backgroundColor = partidoData.colorHex;
    logoBox.style.borderColor = partidoData.colorHex;
    logoBox.classList.remove('border-dashed');
}

/**
 * Valida que haya al menos 2 candidatos y avanza al Paso 3.
 */
function validarYContinuarPaso2() {
    const tarjetas = document.querySelectorAll('.cand-card');
    const msgError = document.getElementById('msg-error-paso2');

    // Filtramos las tarjetas que tengan nombre y partido llenos
    let candidatosValidos = 0;
    tarjetas.forEach(t => {
        const nombre = t.querySelector('.cand-nombre').value.trim();
        const partido = t.querySelector('.cand-partido').value;
        if (nombre && partido) candidatosValidos++;
    });

    if (tarjetas.length < 2 || candidatosValidos < 2) {
        msgError.classList.remove('hidden');
        return;
    }

    msgError.classList.add('hidden');

    // Avanzar UI
    document.getElementById('summary-text-2').innerText = `${candidatosValidos} candidatos registrados`;
    document.getElementById('form-paso-2').classList.add('hidden');
    document.getElementById('summary-paso-2').classList.remove('hidden');
    document.getElementById('form-paso-3').classList.remove('hidden');

    actualizarSidebarWizard(3);
}

// Inicialización: Si entramos a la pestaña de elecciones, generar 2 tarjetas vacías por defecto
document.getElementById('btn-tab-elecciones').addEventListener('click', () => {
    const container = document.getElementById('contenedor-candidatos');
    if (container.children.length === 0) {
        agregarCandidatoUI();
        agregarCandidatoUI();
    }
});