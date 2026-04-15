const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

async function convertToPNG() {
  try {
    // Convert 192x192
    const svg192 = fs.readFileSync(path.join(publicDir, 'icon-192.svg'));
    await sharp(svg192).resize(192, 192).png().toFile(path.join(publicDir, 'icon-192.png'));
    console.log('Created icon-192.png');

    // Convert 512x512
    const svg512 = fs.readFileSync(path.join(publicDir, 'icon-512.svg'));
    await sharp(svg512).resize(512, 512).png().toFile(path.join(publicDir, 'icon-512.png'));
    console.log('Created icon-512.png');

    console.log('\nPNG icons created successfully!');
  } catch (error) {
    console.error('Error converting SVG to PNG:', error);
    process.exit(1);
  }
}

convertToPNG();
