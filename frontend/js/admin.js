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
 * Publica un nuevo proceso electoral con sus restricciones geográficas.
 */
async function crearEleccion() {
    const titulo = document.getElementById('el-titulo').value.trim();
    const desc = document.getElementById('el-desc').value.trim();
    const opcionesStr = document.getElementById('el-opciones').value.trim();
    const cpStr = document.getElementById('el-cp').value.trim();

    if (!titulo || !desc || !opcionesStr) {
        alert("⚠️ Por favor, llena todos los campos obligatorios antes de publicar.");
        return;
    }

    const opciones = opcionesStr.split(',').map(o => o.trim()).filter(o => o !== "");
    const cpPermitidos = cpStr ? cpStr.split(',').map(c => c.trim()) : [];

    const btn = document.getElementById('btn-crear-eleccion');
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = `<span class="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></span> Publicando...`;
    btn.disabled = true;

    try {
        // Envíamos los datos limpios (¡Corregido el fetch duplicado!)
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
            alert("✅ Proceso electoral publicado exitosamente.");
            document.getElementById('el-titulo').value = '';
            document.getElementById('el-desc').value = '';
            document.getElementById('el-opciones').value = '';
            // Reseteamos el selector al estado por defecto
            document.getElementById('el-region').value = 'nacional';
            asignarCPsPorRegion();
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

        // 👇 AQUI ESTABA EL ERROR: Ya dice 'ciudadanos' correctamente
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