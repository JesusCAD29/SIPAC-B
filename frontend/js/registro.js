/**
 * js/registro.js
 * Lógica del escáner OCR, biometría y validación del KYC (Registro).
 */

// --- BLINDAJE DE ENTRADAS (PUNTO 4) ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. El CP solo acepta números y máximo 5
    const inputCP = document.getElementById('f-cp');
    if (inputCP) {
        inputCP.addEventListener('input', function (e) {
            this.value = this.value.replace(/[^0-9]/g, '').slice(0, 5);
        });
    }

    // 2. La Clave INE solo acepta letras, números y todo en mayúsculas (18 chars)
    const inputClave = document.getElementById('f-clave');
    if (inputClave) {
        inputClave.addEventListener('input', function (e) {
            this.value = this.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 18);
        });
    }

    // 3. Los nombres solo aceptan letras y espacios
    const inputsTexto = ['f-ap-pat', 'f-ap-mat', 'f-nombre'];
    inputsTexto.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', function (e) {
                this.value = this.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ\s]/g, '').toUpperCase();
            });
        }
    });
});

/**
 * irAPaso — Navega entre los tres pasos del registro.
 */
function irAPaso(paso) {
    document.querySelectorAll('.paso-container').forEach(el => el.classList.add('hidden'));
    document.getElementById(`paso-${paso}`).classList.remove('hidden');
    for (let i = 1; i <= 3; i++) {
        const dot = document.getElementById(`dot-${i}`);
        dot.className = i <= paso
            ? "w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"
            : "w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-slate-600";
    }
    if (paso === 3) iniciarCamara();
}

/**
 * Función auxiliar para asignar valores seguros y evitar que el OCR rompa el código
 * si un campo no existe en el HTML (Ej. Campos de dirección que eliminamos).
 */
function setVal(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}

/**
 * procesarOCR — Extrae datos de la INE usando Tesseract.js (OCR en navegador).
 */
async function procesarOCR(event) {
    const file = event.target.files[0];
    if (!file) return;

    document.getElementById('upload-ui').classList.add('hidden');
    document.getElementById('preview-img').src = URL.createObjectURL(file);
    document.getElementById('preview-img').classList.remove('hidden');
    document.getElementById('loading-ocr').classList.remove('hidden');

    try {
        const result = await Tesseract.recognize(file, 'spa', {
            logger: m => {
                if (m.status === 'recognizing text') {
                    const pct = Math.round(m.progress * 100);
                    document.getElementById('ocr-status').innerText = `Analizando hologramas... ${pct}%`;
                }
            }
        });

        const texto = result.data.text.toUpperCase();
        const lineas = texto.split('\n').map(l => l.trim()).filter(l => l.length > 2);

        // Clave de Elector
        const claveMatch = texto.match(/\b([A-Z]{6}\d{8}[A-Z0-9]{4})\b/);
        if (claveMatch) setVal('f-clave', claveMatch[1]);

        // CURP
        const curpMatch = texto.match(/\b([A-Z]{4}\d{6}[HM][A-Z]{2}[BCDFGHJKLMNPQRSTVWXYZ]{3}[A-Z0-9]\d)\b/);
        if (curpMatch) setVal('f-curp', curpMatch[1]);

        // Nombre (Busca etiqueta NOMBRE)
        const idxNombre = lineas.findIndex(l => /^NOMBRE$/.test(l));
        if (idxNombre !== -1) {
            const lineaApellidos = lineas[idxNombre + 1] || '';
            const lineaNombres = lineas[idxNombre + 2] || '';
            const partes = lineaApellidos.split(/\s+/).filter(p => p.length > 1);
            if (partes[0]) setVal('f-ap-pat', partes[0]);
            if (partes[1]) setVal('f-ap-mat', partes[1]);
            if (lineaNombres && !/DOMICILIO|CALLE|CURP|CLAVE|MUNICIPIO|ESTADO/.test(lineaNombres)) {
                setVal('f-nombre', lineaNombres);
            }
        }

        // Código Postal
        const cpMatch = texto.match(/C\.?P\.?\s*(\d{5})/);
        if (cpMatch) setVal('f-cp', cpMatch[1]);

        setTimeout(() => irAPaso(2), 600);

    } catch (e) {
        console.error('Error OCR:', e);
        irAPaso(2); // Si falla el OCR, deja al usuario llenar manualmente
    } finally {
        document.getElementById('loading-ocr').classList.add('hidden');
    }
}

/**
 * validarPaso2 — Valida los campos antes de la biometría.
 */
function validarPaso2() {
    const clave = document.getElementById('f-clave').value.trim();
    const password = document.getElementById('f-password').value;
    const passwordConf = document.getElementById('f-password-conf').value;
    const cp = document.getElementById('f-cp').value.trim();
    const nombre = document.getElementById('f-nombre').value.trim();

    if (!clave || clave.length !== 18) {
        alert('⚠️ La Clave de Elector (INE) debe tener exactamente 18 caracteres alfanuméricos.');
        document.getElementById('f-clave').focus();
        return;
    }

    if (!cp || cp.length !== 5) {
        alert('⚠️ El Código Postal debe tener exactamente 5 dígitos numéricos.');
        document.getElementById('f-cp').focus();
        return;
    }

    if (!nombre) {
        alert('⚠️ Por favor, ingresa al menos tu nombre(s).');
        document.getElementById('f-nombre').focus();
        return;
    }

    if (!password || password.length < 6) {
        alert('⚠️ La contraseña debe tener al menos 6 caracteres por seguridad.');
        document.getElementById('f-password').focus();
        return;
    }

    if (password !== passwordConf) {
        alert('❌ Las contraseñas no coinciden. Escríbelas de nuevo.');
        document.getElementById('f-password').value = '';
        document.getElementById('f-password-conf').value = '';
        document.getElementById('f-password').focus();
        return;
    }

    irAPaso(3);
}

// Stream de la cámara web
let streamCamara = null;

async function iniciarCamara() {
    try {
        const video = document.getElementById('webcam');
        streamCamara = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        video.srcObject = streamCamara;
    } catch (e) { console.warn("Cámara no disponible", e); }
}

function tomarFoto() {
    const btn = document.getElementById('btn-foto');
    btn.innerHTML = `<div class="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>`;
    btn.disabled = true;
    setTimeout(() => {
        if (streamCamara) streamCamara.getTracks().forEach(track => track.stop());
        btn.classList.add('hidden');
        document.getElementById('bio-status').classList.remove('hidden');
        document.getElementById('panel-2fa').classList.remove('opacity-50', 'pointer-events-none');
    }, 1500);
}

let codigoReal = "123456";

function enviarCodigoEmail() {
    const email = document.getElementById('f-email').value;
    if (!email.includes('@')) { alert("Ingresa un correo válido."); return; }
    const btn = document.getElementById('btn-enviar-codigo');
    btn.innerText = "Enviando..."; btn.disabled = true;

    setTimeout(() => {
        document.getElementById('fase-email').classList.add('hidden');
        document.getElementById('fase-codigo').classList.remove('hidden');
        alert(`SIMULACIÓN DE CORREO\n\nDe: seguridad@sipac-b.com\nPara: ${email}\n\nCódigo de acceso: ${codigoReal}`);
    }, 1000);
}

async function finalizarRegistro() {
    const codigoIngresado = document.getElementById('f-codigo').value;
    const curp = document.getElementById('f-curp').value;
    const passwordCreada = document.getElementById('f-password').value;
    const cpValido = document.getElementById('f-cp').value.trim();

    if (codigoIngresado !== codigoReal) {
        alert("❌ Código incorrecto. Intenta de nuevo.");
        return;
    }

    const apPat = document.getElementById('f-ap-pat').value.trim();
    const apMat = document.getElementById('f-ap-mat').value.trim();
    const nombres = document.getElementById('f-nombre').value.trim();
    const nombreCompleto = `${apPat} ${apMat} ${nombres}`.trim().toUpperCase();

    const btnFinalizar = document.getElementById('btn-finalizar');
    btnFinalizar.innerHTML = `<div class="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mx-auto"></div>`;
    btnFinalizar.disabled = true;

    try {
        const respuesta = await fetch('/api/registro-ciudadano', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ine: document.getElementById('f-clave').value.trim() || curp,
                nombre: nombreCompleto,
                password: passwordCreada,
                cp: cpValido
            })
        });

        const datos = await respuesta.json();
        if (!respuesta.ok) throw new Error(datos.error || "Error desconocido");

        alert(`✅ ¡Registro Exitoso y Verificado!\nTu ubicación ha sido procesada.\n\nSerás redirigido al Login para votar.`);
        window.location.href = '/';

    } catch (error) {
        const toast = document.getElementById('toast-error');
        toast.innerText = error.message;
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 4000);

        btnFinalizar.innerHTML = "Completar Alta en DB";
        btnFinalizar.disabled = false;
    }
}