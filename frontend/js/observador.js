let chartVotos, chartIA, mapa;
let eleccionIdGlobal = null;
let cadenaGlobal = [];
let capaMarcadores = L.layerGroup();

// Catálogo Maestro de Partidos (Unificado con el resto del sistema)
const catalogoPartidos = [
    { id: 'PAN', nombre: 'Partido Acción Nacional (PAN)', colorHex: '#0055b8' },
    { id: 'PRI', nombre: 'Partido Revolucionario Institucional (PRI)', colorHex: '#da251d' },
    { id: 'PRD', nombre: 'Partido de la Revolución Democrática (PRD)', colorHex: '#ffcc00' },
    { id: 'PVEM', nombre: 'Partido Verde Ecologista de México (PVEM)', colorHex: '#4cb748' },
    { id: 'MC', nombre: 'Movimiento Ciudadano (MC)', colorHex: '#f18132' },
    { id: 'MORENA', nombre: 'Movimiento de Regeneración Nacional (MORENA)', colorHex: '#a60a3d' },
    { id: 'INDEP', nombre: 'Candidato independiente', colorHex: '#8b5cf6' }
];

document.addEventListener('DOMContentLoaded', () => {
    inicializarMapa();
    cargarSelectorElecciones();

    document.getElementById('selector-elecciones').addEventListener('change', (e) => {
        eleccionIdGlobal = e.target.value;
        cargarTodo();
    });

    document.getElementById('buscador-blockchain').addEventListener('input', (e) => {
        const termino = e.target.value.toLowerCase();
        const bloquesFiltrados = cadenaGlobal.filter(b =>
            b.hash.toLowerCase().includes(termino) ||
            b.index.toString() === termino ||
            (b.data && b.data.folio && b.data.folio.toLowerCase().includes(termino))
        );
        renderBlockchain(bloquesFiltrados);
    });
});

/**
 * Inicializa el mapa Leaflet con tile de CartoDB oscuro, centrado en Pachuca.
 * Se llama una única vez al cargar el DOM.
 */
function inicializarMapa() {
    mapa = L.map('mapa-electoral').setView([20.1011, -98.7591], 12);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap & CARTO',
        maxZoom: 20
    }).addTo(mapa);
}

/**
 * Llena el select de elecciones con las opciones activas.
 * No requiere token (ruta pública). Se llama al cargar el DOM.
 */
async function cargarSelectorElecciones() {
    try {
        const respuesta = await fetch('/api/elecciones/activas');
        const elecciones = await respuesta.json();
        const selector = document.getElementById('selector-elecciones');
        selector.innerHTML = '<option value="">-- Selecciona una Elección --</option>';
        elecciones.forEach(e => {
            const opt = document.createElement('option');
            opt.value = e._id;
            opt.text = e.titulo;
            selector.appendChild(opt);
        });
    } catch (e) { console.error(e); }
}

/**
 * Orquestador principal: carga blockchain, estadísticas, IA y mapa para la elección activa.
 * Se dispara cada vez que el usuario cambia el selector de elecciones.
 */
async function cargarTodo() {
    if (!eleccionIdGlobal) return;

    try {
        const resBC = await fetch('/api/blockchain');
        const dataBC = await resBC.json();
        cadenaGlobal = dataBC.cadena || dataBC;

        const cadenaFiltrada = cadenaGlobal.filter(bloque => {
            if (bloque.index === 0) return true;
            return bloque.data && bloque.data.eleccionId === eleccionIdGlobal;
        });

        renderBlockchain(cadenaFiltrada);
        const resStats = await fetch(`/api/estadisticas-completo?eleccionId=${eleccionIdGlobal}`);
        const stats = await resStats.json();

        renderCharts(stats.votos, stats.ia);
        renderTablaIA(stats.propuestas);
        renderizarMapa(stats.votos);

    } catch (e) { console.error(e); }
}

/**
 * Función auxiliar para limpiar las etiquetas de "Nombre (Partido)" a solo "Nombre"
 * y extraer el color hexadecimal oficial.
 */
function procesarDatosGrafica(votosData) {
    const etiquetasLimpias = [];
    const coloresDinamicos = [];
    const datosVotos = [];

    Object.entries(votosData).forEach(([opcionTexto, cantidad]) => {
        let nombreDisplay = opcionTexto;
        let nombrePartido = "";
        let colorAsignado = '#64748b'; // Slate por defecto

        // Extraer el nombre si viene en formato "Juan Pérez (PAN)"
        const match = opcionTexto.match(/^(.*?)\s*\((.*?)\)$/);
        if (match) {
            nombreDisplay = match[1].trim();
            nombrePartido = match[2].trim();
        }

        // Buscar el color en el catálogo
        for (let p of catalogoPartidos) {
            if (nombrePartido.toUpperCase().includes(p.id) || opcionTexto.toUpperCase().includes(p.id)) {
                colorAsignado = p.colorHex;
                break;
            }
        }

        etiquetasLimpias.push(nombreDisplay);
        coloresDinamicos.push(colorAsignado);
        datosVotos.push(cantidad);
    });

    return { labels: etiquetasLimpias, data: datosVotos, colors: coloresDinamicos };
}

/**
 * Renderiza el mapa electoral con marcadores de colores de partido.
 * Las coordenadas son aleatorias dentro de la zona Pachuca (los votos son anónimos);
 * esto es una visualización ilustrativa de la distribución de votos, no cartográfica.
 *
 * @param {object} votos - Objeto { "Nombre (PARTIDO)": count } del endpoint de estadísticas.
 */
function renderizarMapa(votos) {
    if (mapa.hasLayer(capaMarcadores)) {
        capaMarcadores.clearLayers();
    } else {
        capaMarcadores.addTo(mapa);
    }

    const baseLat = 20.1011;
    const baseLng = -98.7591;
    
    const datosProcesados = procesarDatosGrafica(votos);

    // Iteramos usando los datos procesados para usar el color oficial en el mapa también
    datosProcesados.labels.forEach((candidatoLabel, index) => {
        const cantidad = datosProcesados.data[index];
        const color = datosProcesados.colors[index];

        for (let i = 0; i < cantidad; i++) {
            const latRandom = baseLat + (Math.random() - 0.5) * 0.08;
            const lngRandom = baseLng + (Math.random() - 0.5) * 0.08;

            const marcador = L.circleMarker([latRandom, lngRandom], {
                radius: 6,
                fillColor: color,
                color: "#ffffff",
                weight: 1.5,
                opacity: 1,
                fillOpacity: 0.8
            });

            marcador.bindPopup(`
                <div style="text-align: center;">
                    <b style="color: ${color};">${candidatoLabel}</b><br>
                    <span style="font-size: 10px; color: gray;">Voto Encriptado</span>
                </div>
            `);

            capaMarcadores.addLayer(marcador);
        }
    });

    mapa.flyTo([baseLat, baseLng], 12, { duration: 1.5 });
}

/**
 * Renderiza los dos charts: barras de votos por candidato y dona de categorías NLP.
 * Destruye los charts anteriores antes de crear los nuevos para evitar memory leaks.
 *
 * @param {object} votos - Conteo de votos por candidato.
 * @param {object} ia    - Conteo de propuestas por categoría IA.
 */
function renderCharts(votos, ia) {
    if (chartVotos) chartVotos.destroy();
    if (chartIA) chartIA.destroy();

    // 1. Limpiamos los datos usando la función auxiliar
    const procesadosVotos = procesarDatosGrafica(votos);

    const ctxVotos = document.getElementById('chartVotos').getContext('2d');

    chartVotos = new Chart(ctxVotos, {
        type: 'bar',
        data: {
            // 2. Usamos los nombres cortos
            labels: procesadosVotos.labels,
            datasets: [{ 
                label: 'Votos Obtenidos', 
                // 3. Usamos los datos correspondientes
                data: procesadosVotos.data, 
                // 4. Inyectamos los colores dinámicos del partido
                backgroundColor: procesadosVotos.colors, 
                borderRadius: 8, // Barras más suaves
                borderSkipped: false,
                barThickness: 'flex',
                maxBarThickness: 60 // Evita que se hagan gigantes si hay solo 1 candidato
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            animation: { duration: 1500 }, 
            plugins: { 
                legend: { display: false } 
            }, 
            scales: { 
                y: { 
                    beginAtZero: true,
                    grid: { color: '#334155' },
                    ticks: { precision: 0, color: '#94a3b8' } // Para que muestre solo números enteros
                }, 
                x: { 
                    grid: { display: false },
                    ticks: { color: '#cbd5e1', font: { weight: 'bold' } } // Etiquetas de eje X blancas y legibles
                } 
            } 
        }
    });

    chartIA = new Chart(document.getElementById('chartIA'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(ia),
            datasets: [{ data: Object.values(ia), backgroundColor: ['#ec4899', '#06b6d4', '#eab308', '#22c55e', '#a855f7'], borderWidth: 0, hoverOffset: 20 }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '44%', plugins: { legend: { position: 'bottom', labels: { color: '#cbd5e1' } } } }
    });
}

function renderTablaIA(propuestas) {
    const tbody = document.getElementById('tabla-ia');
    tbody.innerHTML = propuestas.length > 0
        ? propuestas.map(p => `
            <tr class="hover:bg-slate-800/50 transition-colors">
                <td class="px-6 py-4 text-slate-300 text-sm italic">"${p.texto}"</td>
                <td class="px-6 py-4"><span class="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-[10px] font-black uppercase">${p.categoriaIA}</span></td>
                <td class="px-6 py-4 text-right"><span class="font-mono text-xs ${p.confianzaIA > 85 ? 'text-green-400' : 'text-yellow-400'}">${p.confianzaIA}%</span></td>
            </tr>
        `).join('')
        : '<tr><td colspan="3" class="px-6 py-10 text-center text-slate-500 italic">No hay propuestas procesadas.</td></tr>';
}

/**
 * Renderiza la tabla de blockchain filtrada por la elección activa.
 * Muestra hash, previousHash y folio de voto (si existe) por cada bloque.
 *
 * @param {Array} cadena - Array de bloques a renderizar.
 */
function renderBlockchain(cadena) {
    const tbody = document.getElementById('tabla-blockchain');
    tbody.innerHTML = cadena.map(b => `
<tr class="hover:bg-slate-800/30 transition-colors">
    <td class="px-6 py-4 font-bold text-slate-500">[${b.index}]</td>
    <td class="px-6 py-4 text-xs text-slate-400">${b.timestamp}</td>
    <td class="px-6 py-4 flex flex-col gap-1.5">
        <div class="flex items-center gap-2">
            <span class="text-[10px] text-slate-500 uppercase font-bold">Hash:</span>
            <code class="text-[10px] text-green-500 bg-green-500/5 px-2 py-1 rounded w-fit break-all">${b.hash}</code>
        </div>
        <div class="flex items-center gap-2">
            <span class="text-[10px] text-slate-500 uppercase font-bold">Prev:</span>
            <code class="text-[10px] text-slate-400 bg-slate-800 px-2 py-1 rounded w-fit break-all">${b.previousHash || '0'}</code>
        </div>
        ${b.index === 0
            ? '<span class="text-xs italic text-slate-500 mt-1 border-t border-slate-700 pt-1">Bloque Génesis</span>'
            : (b.data && b.data.folio
                ? `<span class="text-xs text-slate-400 mt-1 border-t border-slate-700 pt-1">Folio de Voto: <span class="text-indigo-300 font-mono">${b.data.folio}</span></span>`
                : '<span class="text-xs text-slate-400 mt-1 border-t border-slate-700 pt-1">Voto Cifrado</span>')}
    </td>
</tr> 
`).join('');
}

function exportarBitacoraCSV(tipo = 'filtrada') {
    let datosAExportar = [];
    let nombreArchivo = "";

    if (tipo === 'filtrada') {
        if (!eleccionIdGlobal) {
            alert("⚠️ Selecciona una elección primero para exportar su bitácora.");
            return;
        }
        datosAExportar = cadenaGlobal.filter(b => b.index === 0 || (b.data && b.data.eleccionId === eleccionIdGlobal));
        nombreArchivo = `SIPACB_Eleccion_${eleccionIdGlobal}_${new Date().toISOString().split('T')[0]}.csv`;
    } else {
        datosAExportar = cadenaGlobal;
        nombreArchivo = `SIPACB_LibroMayor_Global_${new Date().toISOString().split('T')[0]}.csv`;
    }

    if (datosAExportar.length === 0) {
        alert("No hay datos disponibles para exportar.");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID;FECHA;HASH_ACTUAL;HASH_ANTERIOR;ELECCION_ID;CONTENIDO_VOTO\n";

    datosAExportar.forEach(b => {
        const id = `[${b.index}]`;
        const fecha = b.timestamp;
        const hash = b.hash;
        const prev = b.previousHash || "0";
        const eleccion = (b.index === 0) ? "GENESIS" : (b.data.eleccionId || "N/A");

        let contenido = "N/A";
        if (b.index === 0) contenido = "BLOQUE_INICIAL";
        else if (b.data.voto) contenido = b.data.voto;
        else if (b.data.folio) contenido = `FOLIO_${b.data.folio}`;

        const fila = [id, fecha, hash, prev, eleccion, contenido].map(v => `"${v}"`).join(";");
        csvContent += fila + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", nombreArchivo);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Abre el modal full-screen con la cadena de bloques GLOBAL completa (todas las elecciones).
 * Muestra una fila adicional por bloque con el ID de elección y estado de cifrado.
 */
function abrirModalCompleto() {
    const modal = document.getElementById('modal-blockchain');
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    const tbodyModal = document.getElementById('tabla-modal-blockchain');

    tbodyModal.innerHTML = cadenaGlobal.map(b => {
        if (b.index === 0) {
            return `
                <tr class="hover:bg-slate-800/30 transition-colors">
                    <td class="px-6 py-4 font-bold text-slate-500">[0]</td>
                    <td class="px-6 py-4 text-xs text-slate-400">${b.timestamp}</td>
                    <td class="px-6 py-4 text-sm text-slate-500 font-mono italic">Bloque Génesis Inicializado</td>
                    <td class="px-6 py-4 text-sm text-slate-500 font-mono italic">—</td>
                    <td class="px-6 py-4 text-sm text-slate-500 font-mono italic">—</td>
                </tr>
            `;
        }

        const eleccion = (b.data && b.data.eleccionId) ? b.data.eleccionId : 'N/A';
        const votoDisplay = (b.data && b.data.voto)
            ? b.data.voto
            : `<span class="text-green-500 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded text-[10px] font-black tracking-widest">ENCRIPTADO</span>`;

        return `
            <tr class="hover:bg-slate-800/30 transition-colors">
                <td class="px-6 py-4 font-bold text-slate-500">[${b.index}]</td>
                
                <td class="px-6 py-4 text-xs text-slate-400">${b.timestamp}</td>
                
                <td class="px-6 py-4 flex flex-col gap-1">
                    <div class="flex items-center gap-2">
                        <span class="text-[10px] text-slate-500 uppercase font-bold">Hash:</span>
                        <code class="text-[10px] text-slate-300 font-mono break-all">${b.hash}</code>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-[10px] text-slate-500 uppercase font-bold">Prev:</span>
                        <code class="text-[10px] text-slate-500 font-mono break-all">${b.previousHash || '0'}</code>
                    </div>
                </td>
                
                <td class="px-6 py-4 text-xs text-slate-500 font-mono break-all">${eleccion}</td>
                
                <td class="px-6 py-4 text-sm font-mono">${votoDisplay}</td>
            </tr>
        `;
    }).join('');
}

/** Cierra el modal full-screen de la cadena global. */
function cerrarModalCompleto() {
    const modal = document.getElementById('modal-blockchain');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}