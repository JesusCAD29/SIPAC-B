let chartVotos, chartIA, mapa;
let eleccionIdGlobal = null;
let cadenaGlobal = [];
let capaMarcadores = L.layerGroup();

const coloresCandidatos = {
    "PAN": "#3b82f6",
    "Morena": "#9f1239",
    "Movimiento Ciudadano": "#f97316",
    "PRI": "#16a34a",
    "PRD": "#eab308"
};

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

function inicializarMapa() {
    mapa = L.map('mapa-electoral').setView([20.1011, -98.7591], 12);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap & CARTO',
        maxZoom: 20
    }).addTo(mapa);
}

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

async function cargarTodo() {
    if (!eleccionIdGlobal) return;

    try {
        const resBC = await fetch('/api/blockchain');
        const dataBC = await resBC.json();
        // Guardamos TODA la cadena maestra en memoria (sin alterar)
        cadenaGlobal = dataBC.cadena || dataBC;

        // --- EL NUEVO FILTRO VISUAL ---
        // Filtramos para mostrar SOLO el Bloque Génesis (index 0) Y los votos de la elección actual
        const cadenaFiltrada = cadenaGlobal.filter(bloque => {
            // Siempre mostramos el bloque Génesis
            if (bloque.index === 0) return true;
            // Si es un voto, revisamos si su eleccionId coincide con el selector actual
            return bloque.data && bloque.data.eleccionId === eleccionIdGlobal;
        });

        // Dibujamos SOLO la cadena filtrada
        renderBlockchain(cadenaFiltrada);
        const resStats = await fetch(`/api/estadisticas-completo?eleccionId=${eleccionIdGlobal}`);
        const stats = await resStats.json();

        renderCharts(stats.votos, stats.ia);
        renderTablaIA(stats.propuestas);
        renderizarMapa(stats.votos);

    } catch (e) { console.error(e); }
}

function renderizarMapa(votos) {
    if (mapa.hasLayer(capaMarcadores)) {
        capaMarcadores.clearLayers();
    } else {
        capaMarcadores.addTo(mapa);
    }

    const baseLat = 20.1011;
    const baseLng = -98.7591;

    Object.entries(votos).forEach(([candidato, cantidad]) => {
        const color = coloresCandidatos[candidato] || "#94a3b8";

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
                    <b style="color: ${color};">${candidato}</b><br>
                    <span style="font-size: 10px; color: gray;">Voto Encriptado</span>
                </div>
            `);

            capaMarcadores.addLayer(marcador);
        }
    });

    mapa.flyTo([baseLat, baseLng], 12, { duration: 1.5 });
}

function renderCharts(votos, ia) {
    if (chartVotos) chartVotos.destroy();
    if (chartIA) chartIA.destroy();

    const ctxVotos = document.getElementById('chartVotos').getContext('2d');
    const gradVotos = ctxVotos.createLinearGradient(0, 0, 0, 400);
    gradVotos.addColorStop(0, '#6366f1');
    gradVotos.addColorStop(1, '#312e81');

    chartVotos = new Chart(ctxVotos, {
        type: 'bar',
        data: {
            labels: Object.keys(votos),
            datasets: [{ label: 'Votos', data: Object.values(votos), backgroundColor: gradVotos, borderRadius: 12, barThickness: 40 }]
        },
        options: { responsive: true, maintainAspectRatio: false, animation: { duration: 1500 }, plugins: { legend: { display: false } }, scales: { y: { grid: { color: '#334155' } }, x: { grid: { display: false } } } }
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

/**
 * Motor de Exportación Dual (CSV)
 * @param {string} tipo - 'filtrada' para la elección actual, 'global' para toda la red.
 */
function exportarBitacoraCSV(tipo = 'filtrada') {
    // 1. Determinar qué datos exportar
    let datosAExportar = [];
    let nombreArchivo = "";

    if (tipo === 'filtrada') {
        if (!eleccionIdGlobal) {
            alert("⚠️ Selecciona una elección primero para exportar su bitácora.");
            return;
        }
        // Filtramos la cadena global para obtener solo lo relacionado a la elección
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

    // 2. Construir cabeceras idénticas a las tablas (5 columnas)
    // Usamos punto y coma (;) para mejor compatibilidad con Excel en español
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID;FECHA;HASH_ACTUAL;HASH_ANTERIOR;ELECCION_ID;CONTENIDO_VOTO\n";

    // 3. Mapear los datos
    datosAExportar.forEach(b => {
        const id = `[${b.index}]`;
        const fecha = b.timestamp;
        const hash = b.hash;
        const prev = b.previousHash || "0";
        const eleccion = (b.index === 0) ? "GENESIS" : (b.data.eleccionId || "N/A");

        // El contenido es el Folio o el Voto
        let contenido = "N/A";
        if (b.index === 0) contenido = "BLOQUE_INICIAL";
        else if (b.data.voto) contenido = b.data.voto;
        else if (b.data.folio) contenido = `FOLIO_${b.data.folio}`;

        // Limpiamos posibles comas o saltos de línea para no romper el CSV
        const fila = [id, fecha, hash, prev, eleccion, contenido].map(v => `"${v}"`).join(";");
        csvContent += fila + "\n";
    });

    // 4. Ejecutar descarga
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", nombreArchivo);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- LÓGICA DEL MODAL DE PANTALLA COMPLETA ---

// --- LÓGICA DEL MODAL DE PANTALLA COMPLETA ---

// --- LÓGICA DEL MODAL DE PANTALLA COMPLETA ---

function abrirModalCompleto() {
    // 1. Mostramos el modal oscuro
    const modal = document.getElementById('modal-blockchain');
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    // 2. Apuntamos a la tabla de ADENTRO del modal
    const tbodyModal = document.getElementById('tabla-modal-blockchain');

    // 3. Dibujamos la cadenaGlobal adaptada a tus nuevas columnas: ID | FECHA | HASH (Current & Prev) | ELECCIÓN | VOTO
    tbodyModal.innerHTML = cadenaGlobal.map(b => {
        // --- CASO A: BLOQUE GÉNESIS ---
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

        // --- CASO B: BLOQUE DE VOTO ---

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

function cerrarModalCompleto() {
    // Ocultamos el modal
    const modal = document.getElementById('modal-blockchain');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}