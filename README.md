# 🚀 Habit Tracker - Guía de Despliegue en Producción

Una aplicación PWA (Progressive Web App) para el seguimiento de hábitos diarios, construida con Next.js 14, Supabase y TypeScript.

## 📱 Características PWA

- ✅ **Descargable como app móvil** desde el navegador
- ✅ **Funciona offline** con cache inteligente
- ✅ **Notificaciones push** (configurables)
- ✅ **Instalación en home screen**
- ✅ **Experiencia nativa en móvil y desktop**

## 🛠️ Tecnologías

- **Frontend**: Next.js 14 con TypeScript
- **Base de Datos**: Supabase (PostgreSQL)
- **Estado**: Zustand
- **Estilizado**: Tailwind CSS
- **PWA**: next-pwa
- **Internacionalización**: next-i18next

## 🚀 Opciones de Despliegue

### 1. Vercel (Recomendado - Gratis)

**Paso a paso:**

1. **Sube tu código a GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/tu-usuario/habit-tracker.git
   git push -u origin main
   ```

2. **Conecta con Vercel:**
   - Ve a [vercel.com](https://vercel.com)
   - Haz click en "New Project"
   - Importa tu repositorio de GitHub
   - Vercel detectará automáticamente que es un proyecto Next.js

3. **Configura las variables de entorno en Vercel:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://ukyfwogfhvagpctuvzen.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon_de_supabase
   NODE_ENV=production
   ```

4. **Deploy automático:**
   - Vercel hará el build y deploy automáticamente
   - Cada push a main desplegará automáticamente

### 2. Netlify (Alternativa Gratis)

1. **Conecta GitHub a Netlify:**
   - Ve a [netlify.com](https://netlify.com)
   - "New site from Git" → Conecta GitHub

2. **Configuración de build:**
   ```
   Build command: npm run build
   Publish directory: .next
   ```

3. **Variables de entorno en Netlify:**
   - Site settings → Environment variables
   - Agrega las mismas variables que en Vercel

### 3. Railway (Gratis con límites)

1. **Conecta GitHub:**
   - Ve a [railway.app](https://railway.app)
   - "New Project" → "Deploy from GitHub repo"

2. **Variables de entorno:**
   - Se configuran igual que en Vercel/Netlify

## 📱 Configuración PWA

### Íconos Requeridos

Necesitas crear estos íconos en `public/icons/`:

- `icon-32x32.png`
- `icon-72x72.png`
- `icon-96x96.png`
- `icon-128x128.png`
- `icon-144x144.png`
- `icon-152x152.png`
- `icon-192x192.png`
- `icon-384x384.png`
- `icon-512x512.png`
- `apple-touch-icon.png` (180x180)

**Herramientas para generar íconos:**
- [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator)
- [Favicon.io](https://favicon.io/)
- [RealFaviconGenerator](https://realfavicongenerator.net/)

### Verificar PWA

Después del despliegue:

1. **Chrome DevTools:**
   - F12 → Application → Manifest
   - Verificar que el manifest.json carga correctamente

2. **Lighthouse:**
   - F12 → Lighthouse → Progressive Web App
   - Debe obtener 100/100 puntos

3. **Prueba de instalación:**
   - En Chrome móvil: "Añadir a pantalla de inicio"
   - En Chrome desktop: Ícono de instalación en la barra de direcciones

## 🔧 Variables de Entorno Requeridas

```bash
# Supabase (Obligatorias)
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima

# App (Opcionales)
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
NODE_ENV=production
```

## 🏗️ Build Local

```bash
# Instalar dependencias
npm install

# Build de producción
npm run build:production

# Iniciar servidor de producción local
npm start

# Verificar tipos
npm run type-check
```

## 📱 Cómo Descargar la App

### En Android:

1. Abre la app en Chrome
2. Menú (3 puntos) → "Añadir a pantalla de inicio"
3. O aparecerá banner automático "Instalar app"

### En iOS:

1. Abre la app en Safari
2. Botón compartir → "Añadir a pantalla de inicio"

### En Desktop:

1. Chrome: Ícono de instalación en barra de direcciones
2. Edge: Similar a Chrome
3. La app se instala como aplicación nativa

## 🔒 Configuración de Seguridad

### Supabase RLS (Row Level Security)

Asegúrate de que tienes las políticas correctas:

```sql
-- Ejemplo de política para habits
CREATE POLICY "Users can view own habits" ON habits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own habits" ON habits
    FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### Variables de Entorno

- ✅ Nunca commitear archivos `.env*` 
- ✅ Usar `NEXT_PUBLIC_` solo para variables que pueden ser públicas
- ✅ Variables sensibles solo en el servidor

## 📊 Monitoreo

### Herramientas recomendadas:

- **Vercel Analytics** (si usas Vercel)
- **Google Analytics** 
- **Sentry** para error tracking
- **Supabase Dashboard** para métricas de BD

## 🚨 Troubleshooting

### Error de Build:

```bash
# Limpiar cache
rm -rf .next node_modules
npm install
npm run build
```

### PWA no se instala:

1. Verificar que todas las imágenes de íconos existen
2. Revisar manifest.json en DevTools
3. Asegurar HTTPS en producción

### Error de Supabase:

1. Verificar variables de entorno
2. Revisar políticas RLS
3. Verificar conexión en Supabase Dashboard

## 📈 Optimizaciones

### Performance:

- ✅ Imágenes optimizadas con Next.js Image
- ✅ Code splitting automático
- ✅ PWA cache strategy
- ✅ Memoización de componentes

### SEO:

- ✅ Meta tags configuradas
- ✅ Structured data
- ✅ Sitemap automático (Next.js)
- ✅ Open Graph tags

## 🎯 Siguientes Pasos

1. **Configurar dominio personalizado**
2. **Implementar analytics**
3. **Configurar notificaciones push**
4. **Optimizar para app stores** (opcional)
5. **Configurar CI/CD avanzado**

---

¡Tu Habit Tracker ya está listo para producción! 🎉 