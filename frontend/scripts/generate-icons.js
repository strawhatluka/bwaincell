const fs = require('fs');
const path = require('path');

// SVG icon template with gradient and "B" letter
const createSVG = (size) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#e84d8a;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#b24592;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#f2994a;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="url(#grad)"/>
  <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="${size * 0.6}"
        font-weight="bold" fill="white">B</text>
</svg>`;

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate 192x192 icon
const svg192 = createSVG(192);
fs.writeFileSync(path.join(publicDir, 'icon-192.svg'), svg192);
console.log('Created icon-192.svg');

// Generate 512x512 icon
const svg512 = createSVG(512);
fs.writeFileSync(path.join(publicDir, 'icon-512.svg'), svg512);
console.log('Created icon-512.svg');

console.log('\nSVG icons created successfully!');
console.log('Note: You can convert these to PNG using an online converter or sharp library.');
console.log('For now, update manifest.json to use .svg files or install sharp for PNG conversion.');
