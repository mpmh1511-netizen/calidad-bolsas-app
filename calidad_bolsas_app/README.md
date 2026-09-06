# Sistema de Control de Calidad - Fábrica de Bolsas de Papel

Esta aplicación web permite registrar y visualizar las inspecciones de calidad de bolsas de papel para tres áreas productivas específicas: **Flexo (Impresión)**, **Nanjang (Sin Asa)** y **Con Asa**.

## Estructura de Vistas

1. **Vista de Inspector:**
   - Permite dar de alta las **Bobinas** de papel activas con sus características (gramaje, ancho, humedad, marca).
   - Formularios dinámicos de inspección de calidad específicos para cada área y sus máquinas correspondientes (Flexo 1-4, M1-M5, M6-M11).
   - Registro inteligente de **No Conformidades** (defectos) con descripción, acciones correctivas e imágenes tomadas en tiempo real.

2. **Vista de Jefes / Supervisores:**
   - Indicadores de rendimiento del día seleccionado (KPIs de aprobación, defectos).
   - Visualización de datos **agrupada y dividida por días** mediante una barra de tiempo interactiva.
   - Historial detallado de auditorías e imágenes de los defectos reportados con sus acciones correctivas correspondientes.
   - Gráfico de barra de rendimiento por máquina basado en su tasa de aprobación.

---

## Requisitos Previos

Para ejecutar esta aplicación en tu Mac, necesitas tener instalado **Node.js** (que incluye `npm`).

### Cómo instalar Node.js:
1. Ve al sitio oficial: [nodejs.org](https://nodejs.org/)
2. Descarga e instala la versión **LTS** recomendada para macOS (instalador `.pkg`).
3. Sigue las instrucciones en pantalla del asistente de instalación.

---

## Cómo Ejecutar la Aplicación

Una vez instalado Node.js:

1. Abre la **Terminal** en tu Mac.
2. Navega al directorio del proyecto:
   ```bash
   cd "/Users/a52464/.gemini/antigravity/scratch/calidad_bolsas_app"
   ```
3. Instala las dependencias del proyecto:
   ```bash
   npm install
   ```
4. Inicia el servidor de desarrollo (ejecuta tanto el frontend de Vite como el backend en Express simultáneamente):
   ```bash
   npm run dev
   ```
5. Abre la aplicación en tu navegador en:
   [http://localhost:5173](http://localhost:5173)

---

## Tecnologías Utilizadas

- **Frontend:** React + Vite (Vanilla CSS con diseño premium oscuro).
- **Backend:** Node.js + Express (API REST y carga de imágenes con `multer`).
- **Base de Datos:** SQLite (persistido localmente en `server/calidad_bolsas.db`).
