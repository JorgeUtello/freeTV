# 📺 freeTV - Reproductor de Canales en Vivo

Aplicación web para reproducir canales de TV argentinos en directo usando HLS (HTTP Live Streaming).

## 🚀 Instalación

```bash
npm install
```

## ▶️ Cómo Correr Localmente

### Opción 1: Ambos servicios juntos (recomendado)
```bash
npm run dev:full
```
Esto inicia:
- **Servidor proxy**: http://localhost:3000/api (resuelve CORS)
- **Vite dev server**: http://localhost:5173 (la app)

### Opción 2: Por separado

Terminal 1 - Servidor proxy:
```bash
npm run server
```

Terminal 2 - Dev server:
```bash
npm run dev
```

Luego abre http://localhost:5173 en tu navegador.

## 🌐 Deployment en Vercel

### Paso 1: Preparar el repositorio
```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push
```

### Paso 2: Conectar a Vercel
1. Ve a https://vercel.com
2. Haz clic en "New Project"
3. Importa tu repositorio de GitHub
4. Vercel detectará automáticamente:
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`

### Paso 3: Deploy
Vercel automáticamente:
- Compila el frontend con Vite
- Despliega las funciones serverless en `/api`
- Sirve todo en tu dominio

**Eso es todo!** 🎉

### URLs en Vercel
Tu app estará en: `https://tu-proyecto.vercel.app`
Las funciones en: `https://tu-proyecto.vercel.app/api/stream?channel=telefe`

## 📡 Cómo Funciona

### El Problema
Las URLs de streaming tienen restricciones **CORS**. El navegador bloquea solicitudes desde dominios diferentes.

### La Solución
Utilizamos **funciones serverless** (Vercel Functions) que actúan como proxy:

**Localmente:**
```
[Navegador] → [Express server localhost:3000] → [Canales]
```

**En Vercel:**
```
[Navegador] → [Vercel Functions /api] → [Canales]
```

Ambas arquitecturas usan la misma lógica de proxy, solo que:
- **Localmente**: Express tradicional (`server.js`)
- **Vercel**: Serverless Functions (`api/stream.js`)

## 🎛️ Canales Disponibles

| Canal | URL Origen |
|-------|-----------|
| **Telefe** | Akamaized CDN |
| **América** | Google DAI |
| **El Trece** | vodgc.net |

## 📦 Dependencias

### Frontend
- `vite` - Build tool ultra-rápido
- `hls.js` - Reproductor HLS

### Backend (Local)
- `express` - Framework web
- `cors` - Middleware para CORS
- `node-fetch` - HTTP requests

### Dev
- `concurrently` - Correr múltiples comandos

## � Estructura del Proyecto

```
freeTV/
├── api/
│   └── stream.js        ← Función serverless para Vercel
├── server.js            ← Backend proxy local (Express)
├── main.js              ← Lógica del frontend
├── index.html           ← HTML principal
├── style.css            ← Estilos
├── vercel.json          ← Config de Vercel
├── .vercelignore        ← Archivos a ignorar en Vercel
├── package.json         ← Dependencias y scripts
└── src/                 ← Código adicional del frontend
```

## � Detección Automática

El archivo `main.js` detecta automáticamente el entorno:
```javascript
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : '/api';
```

- Si estás en **localhost** → usa el servidor local
- Si estás en **Vercel** → usa las funciones serverless

## 🐛 Troubleshooting

### "Cannot fetch /api/stream"
**Localmente:**
- Verifica que `npm run server` está corriendo
- Comprueba puerto 3000: `http://localhost:3000/api/health` (esto fallará, es normal)

**En Vercel:**
- Revisa los logs: `vercel logs` en terminal
- Verifica que `api/stream.js` existe

### Video no carga
- Abre consola (F12) y busca errores CORS
- Los tokens de streaming pueden expirar, será necesario actualizar URLs

### Puerto 3000 ya está en uso
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3000
kill -9 <PID>
```

## 🚀 Flujo de Desarrollo

1. **Desarrollo local**: `npm run dev:full`
2. **Testing**: Prueba en http://localhost:5173
3. **Commit**: `git add . && git commit -m "mensaje"`
4. **Push**: `git push` 
5. **Vercel**: Auto-deploy al detectar cambios

## 📚 Recursos

- [Vercel Functions](https://vercel.com/docs/functions/introduction)
- [HLS.js Docs](https://github.com/video-dev/hls.js/wiki)
- [Vite Docs](https://vitejs.dev)

---

Hecho con ❤️ - Jorge Utello
