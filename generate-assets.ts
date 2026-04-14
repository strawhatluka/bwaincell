import { Canvas } from 'skia-canvas';
import fs from 'fs';
import path from 'path';
import { logger } from './shared/utils/logger';

// Ensure assets directory exists
const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Function to create Onion Knight icon (1024x1024)
function createIcon(): void {
  const canvas = new Canvas(1024, 1024);
  const ctx = canvas.getContext('2d');

  // Clear background (transparent)
  ctx.clearRect(0, 0, 1024, 1024);

  // Draw onion-shaped helmet
  ctx.fillStyle = '#E6D7FF'; // Light purple for onion
  ctx.strokeStyle = '#8B7AB8'; // Darker purple outline
  ctx.lineWidth = 8;

  // Onion body (helmet)
  ctx.beginPath();
  ctx.ellipse(512, 512, 280, 340, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Onion top point
  ctx.beginPath();
  ctx.moveTo(512, 172);
  ctx.quadraticCurveTo(480, 250, 440, 320);
  ctx.lineTo(584, 320);
  ctx.quadraticCurveTo(544, 250, 512, 172);
  ctx.fillStyle = '#E6D7FF';
  ctx.fill();
  ctx.stroke();

  // Face visor area
  ctx.fillStyle = '#2C2C2C';
  ctx.beginPath();
  ctx.ellipse(512, 520, 180, 140, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes (cute dots)
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(460, 500, 25, 0, Math.PI * 2);
  ctx.arc(564, 500, 25, 0, Math.PI * 2);
  ctx.fill();

  // Cute smile
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(512, 520, 60, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();

  // Armor layers (onion rings)
  ctx.strokeStyle = '#8B7AB8';
  ctx.lineWidth = 4;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(512, 400 + i * 80, 260 - i * 20, 40, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Little highlight on helmet
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.beginPath();
  ctx.ellipse(420, 380, 60, 80, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Save icon
  const buffer = canvas.toBufferSync('png');
  fs.writeFileSync(path.join(assetsDir, 'bwaincell-icon.png'), buffer);
  logger.info('Icon created successfully', {
    file: 'assets/bwaincell-icon.png',
    dimensions: '1024x1024',
  });
}

// Function to create Onion Knight banner (680x240)
function createBanner(): void {
  const canvas = new Canvas(680, 240);
  const ctx = canvas.getContext('2d');

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 680, 240);
  gradient.addColorStop(0, '#9B88D3');
  gradient.addColorStop(1, '#6B5A9B');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 680, 240);

  // Draw pattern of small onions
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = '#FFFFFF';
  for (let x = 20; x < 680; x += 80) {
    for (let y = 20; y < 240; y += 80) {
      ctx.beginPath();
      ctx.ellipse(x, y, 25, 30, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // Main onion knight (left side)
  ctx.fillStyle = '#E6D7FF';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3;

  // Helmet
  ctx.beginPath();
  ctx.ellipse(120, 120, 70, 85, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Onion top
  ctx.beginPath();
  ctx.moveTo(120, 35);
  ctx.quadraticCurveTo(110, 55, 100, 75);
  ctx.lineTo(140, 75);
  ctx.quadraticCurveTo(130, 55, 120, 35);
  ctx.fill();
  ctx.stroke();

  // Face
  ctx.fillStyle = '#2C2C2C';
  ctx.beginPath();
  ctx.ellipse(120, 125, 45, 35, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(105, 120, 8, 0, Math.PI * 2);
  ctx.arc(135, 120, 8, 0, Math.PI * 2);
  ctx.fill();

  // Text "Bwaincell"
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 72px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Bwaincell', 400, 120);

  // Subtitle
  ctx.font = '24px Arial';
  ctx.fillStyle = '#E6D7FF';
  ctx.fillText('Your Onion Knight Assistant', 400, 170);

  // Save banner
  const buffer = canvas.toBufferSync('png');
  fs.writeFileSync(path.join(assetsDir, 'bwaincell-banner.png'), buffer);
  logger.info('Banner created successfully', {
    file: 'assets/bwaincell-banner.png',
    dimensions: '680x240',
  });
}

interface ModuleNotFoundError extends Error {
  code: string;
}

function isModuleNotFoundError(error: any): error is ModuleNotFoundError {
  return error && typeof error === 'object' && error.code === 'MODULE_NOT_FOUND';
}

// Check if canvas is installed
try {
  createIcon();
  createBanner();
  logger.info('Assets generated successfully', {
    folder: 'assets/',
    files: ['bwaincell-icon.png (1024x1024)', 'bwaincell-banner.png (680x240)'],
  });
} catch (error) {
  if (isModuleNotFoundError(error)) {
    logger.warn('Canvas module not found', {
      action: 'Run: npm install skia-canvas',
      note: 'skia-canvas is a modern drop-in replacement',
      platforms: {
        windows: 'Pre-built binaries, no dependencies needed',
        mac: 'Pre-built binaries, no dependencies needed',
        linux: 'Pre-built binaries, no dependencies needed',
      },
    });
  } else {
    logger.error('Error generating assets', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}
