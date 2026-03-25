# SIPAC-B: Sistema de Participación Ciudadana con Blockchain (V2.0)

![Estado](https://img.shields.io/badge/Estado-En_Desarrollo_(Sprint_1)-blue)
![Arquitectura](https://img.shields.io/badge/Arquitectura-Microservicios_Híbrida-success)
![Licencia](https://img.shields.io/badge/Licencia-Educativa_TecNM-orange)

**SIPAC-B** es una solución tecnológica integral de *GovTech* diseñada para modernizar, asegurar y transparentar los procesos democráticos, consultas vecinales y presupuestos participativos. 

Al descentralizar el registro de votos mediante tecnología Blockchain e integrar motores de Inteligencia Artificial (NLP/Big Data), el sistema erradica la opacidad electoral, reduce la fricción de participación y transforma los votos en inteligencia gubernamental accionable.

---

## Características Principales

* **Identidad Híbrida Segura (Sin brecha digital):** Validación de ciudadanos mediante el escaneo de credenciales oficiales (OCR) combinado con autenticación de doble factor vía SMS (2FA).
* **Inmutabilidad Criptográfica:** Cada voto es cifrado (AES-256) desde el dispositivo del usuario y registrado como una transacción inmutable en una red Blockchain permisionada.
* **Transparencia Activa (Caja de Cristal):** Portal público para que ONGs y auditores visualicen la confirmación de bloques en tiempo real mediante WebSockets.
* **Inteligencia de Datos (Big Data):** Motor analítico capaz de procesar propuestas masivas, categorizarlas por sentimiento y generar *Mapas de Calor* geoespaciales.
* **Gestión Ágil (Drag-and-Drop):** Panel administrativo intuitivo que permite a los funcionarios configurar boletas y elecciones en minutos.

---

## Stack Tecnológico (Tech Stack)

* **Frontend:** HTML5, Tailwind CSS, JavaScript Vanilla (Diseño UX "No Crypto").
* **Backend Core:** Node.js con Express. Integración APIs (Twilio SMS, OCR).
* **Backend Analítico:** Python con FastAPI (Procesamiento NLP).
* **Bases de Datos:** MongoDB.
* **Blockchain:** Hyperledger Fabric (o red DLT equivalente).

---

## Cómo empezar (Entorno de Desarrollo)

1. Clona este repositorio: `git clone https://github.com/JesusCAD29/SIPAC-B.git`
2. Abre la carpeta en **Visual Studio Code**.
3. Abre los archivos de la carpeta `/frontend` en tu navegador para visualizar los mockups funcionales.

---
**Desarrollado por el Equipo 12 - Fundamentos de Ingeniería de Software** *Tecnológico Nacional de México* *(Cristopher Ali Cruz Romero, Jesús Yahir García Chávez, Ángel Uriel Cortes Martínez)*