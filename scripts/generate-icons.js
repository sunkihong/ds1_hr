import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Crisp modern Dental Tooth + Clock/Calendar badge SVG
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="100%" stop-color="#0369a1" />
    </linearGradient>
    <linearGradient id="toothGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#f0f9ff" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.15" />
    </filter>
  </defs>

  <!-- Background rounded canvas -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)" />

  <!-- Dental Tooth Icon in Center -->
  <g filter="url(#shadow)" transform="translate(136, 110)">
    <!-- Stylized Tooth Path -->
    <path d="M120 20 C185 20, 220 55, 220 110 C220 160, 200 190, 185 240 C170 290, 150 330, 125 330 C110 330, 115 270, 120 230 C122 210, 120 190, 120 180 C120 190, 118 210, 120 230 C125 270, 130 330, 115 330 C90 330, 70 290, 55 240 C40 190, 20 160, 20 110 C20 55, 55 20, 120 20 Z" 
          fill="url(#toothGrad)" />
    
    <!-- Tooth Shine Highlight -->
    <path d="M60 70 C55 100, 58 130, 68 155 C70 160, 78 158, 77 152 C68 128, 65 100, 70 70 C71 64, 61 64, 60 70 Z" 
          fill="#38bdf8" opacity="0.6" />

    <!-- Mini Green Plus / Dental Cross Badge -->
    <circle cx="175" cy="225" r="42" fill="#10b981" />
    <rect x="169" y="199" width="12" height="52" rx="4" fill="#ffffff" />
    <rect x="149" y="219" width="52" height="12" rx="4" fill="#ffffff" />
  </g>
</svg>`;

// Maskable SVG with safe margin padding (centered tooth)
const maskableSvgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="100%" stop-color="#0369a1" />
    </linearGradient>
    <linearGradient id="toothGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#f0f9ff" />
    </linearGradient>
  </defs>

  <!-- Full Bleed Background -->
  <rect width="512" height="512" fill="url(#bgGrad2)" />

  <!-- Centered in 80% Safe Zone (padding around) -->
  <g transform="translate(156, 130) scale(0.85)">
    <path d="M120 20 C185 20, 220 55, 220 110 C220 160, 200 190, 185 240 C170 290, 150 330, 125 330 C110 330, 115 270, 120 230 C122 210, 120 190, 120 180 C120 190, 118 210, 120 230 C125 270, 130 330, 115 330 C90 330, 70 290, 55 240 C40 190, 20 160, 20 110 C20 55, 55 20, 120 20 Z" 
          fill="url(#toothGrad2)" />
    <path d="M60 70 C55 100, 58 130, 68 155 C70 160, 78 158, 77 152 C68 128, 65 100, 70 70 C71 64, 61 64, 60 70 Z" 
          fill="#38bdf8" opacity="0.6" />
    <circle cx="175" cy="225" r="42" fill="#10b981" />
    <rect x="169" y="199" width="12" height="52" rx="4" fill="#ffffff" />
    <rect x="149" y="219" width="52" height="12" rx="4" fill="#ffffff" />
  </g>
</svg>`;

async function run() {
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent);
  console.log('Saved icon.svg');

  const svgBuffer = Buffer.from(svgContent);
  const maskableBuffer = Buffer.from(maskableSvgContent);

  await sharp(svgBuffer).resize(192, 192).png().toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log('Saved pwa-192x192.png');

  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log('Saved pwa-512x512.png');

  await sharp(svgBuffer).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Saved apple-touch-icon.png');

  await sharp(maskableBuffer).resize(512, 512).png().toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
  console.log('Saved pwa-maskable-512x512.png');
}

run().catch(console.error);
