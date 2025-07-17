const fs = require('fs');
const path = require('path');

// Instrucciones para generar íconos
console.log('\n🎨 GENERADOR DE ÍCONOS PWA');
console.log('==========================\n');

console.log('Para generar todos los íconos necesarios para tu PWA, sigue estos pasos:\n');

console.log('📋 OPCIÓN 1 - Herramientas Online (Recomendado):');
console.log('1. Ve a https://www.pwabuilder.com/imageGenerator');
console.log('2. Sube tu logo actual (logo.svg o favicon.svg)');
console.log('3. Descarga el paquete completo de íconos');
console.log('4. Extrae todos los archivos en public/icons/\n');

console.log('📋 OPCIÓN 2 - Herramientas Manuales:');
console.log('1. Ve a https://favicon.io/favicon-converter/');
console.log('2. Sube tu logo y genera múltiples tamaños');
console.log('3. Descarga y renombra según manifest.json\n');

console.log('📋 OPCIÓN 3 - Comandos (requiere ImageMagick):');
console.log('npm install -g imagemagick');
console.log('Luego ejecuta el script de conversión:\n');

const sizes = [32, 72, 96, 128, 144, 152, 192, 384, 512];
const iconPath = path.join(process.cwd(), 'public', 'icons');

// Crear directorio si no existe
if (!fs.existsSync(iconPath)) {
  fs.mkdirSync(iconPath, { recursive: true });
  console.log('✅ Directorio public/icons/ creado');
}

console.log('🔧 Comandos ImageMagick para generar íconos:');
console.log('(Ejecuta estos comandos en la terminal después de instalar ImageMagick)\n');

sizes.forEach(size => {
  console.log(`convert public/logo.svg -resize ${size}x${size} public/icons/icon-${size}x${size}.png`);
});

console.log('\n📱 Para Apple Touch Icon:');
console.log('convert public/logo.svg -resize 180x180 public/icons/apple-touch-icon.png\n');

console.log('✅ VERIFICACIÓN:');
console.log('Después de generar los íconos, verifica que tienes:');
sizes.forEach(size => {
  console.log(`  - icon-${size}x${size}.png`);
});
console.log('  - apple-touch-icon.png\n');

console.log('🚀 Una vez generados todos los íconos, tu PWA estará lista para producción!');

// Verificar íconos existentes
console.log('\n📊 ESTADO ACTUAL:');
const existingIcons = fs.readdirSync(iconPath).filter(file => file.endsWith('.png'));
if (existingIcons.length > 0) {
  console.log('✅ Íconos encontrados:');
  existingIcons.forEach(icon => console.log(`  - ${icon}`));
} else {
  console.log('⚠️  No se encontraron íconos PNG en public/icons/');
  console.log('   Necesitas generar los íconos antes de desplegar');
}

console.log('\n' + '='.repeat(50));
console.log('💡 TIP: También puedes usar tu diseñador favorito como');
console.log('   Figma, Canva, o GIMP para crear los íconos manualmente.');
console.log('='.repeat(50) + '\n'); 