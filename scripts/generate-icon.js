const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const buildDir = path.join(projectRoot, 'build');
const iconSource = path.join(buildDir, 'icon.png');
const iconsetDir = path.join(buildDir, 'icon.iconset');
const outputDir = path.join(buildDir, 'icons');
const outputIcns = path.join(outputDir, 'icon.icns');

// Ensure source exists
if (!fs.existsSync(iconSource)) {
  console.error(`Error: Source icon not found at ${iconSource}`);
  process.exit(1);
}

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Create temporary iconset directory
if (fs.existsSync(iconsetDir)) {
  fs.rmSync(iconsetDir, { recursive: true, force: true });
}
fs.mkdirSync(iconsetDir);

console.log('Generating iconset from', iconSource);

// Standard sizes for .iconset (macOS)
const sizes = [
  { size: 16, name: 'icon_16x16.png' },
  { size: 32, name: 'icon_16x16@2x.png' },
  { size: 32, name: 'icon_32x32.png' },
  { size: 64, name: 'icon_32x32@2x.png' },
  { size: 128, name: 'icon_128x128.png' },
  { size: 256, name: 'icon_128x128@2x.png' },
  { size: 256, name: 'icon_256x256.png' },
  { size: 512, name: 'icon_256x256@2x.png' },
  { size: 512, name: 'icon_512x512.png' },
  { size: 1024, name: 'icon_512x512@2x.png' }
];

try {
  // Generate .iconset sizes
  for (const { size, name } of sizes) {
    const outPath = path.join(iconsetDir, name);
    execSync(`sips -z ${size} ${size} "${iconSource}" --out "${outPath}"`);
  }
  console.log('Generated .iconset files');

  // Convert iconset to icns
  console.log('Converting iconset to icns...');
  execSync(`iconutil -c icns "${iconsetDir}" -o "${outputIcns}"`);
  console.log(`Successfully created ${outputIcns}`);

  // Generate Linux icons (direct PNGs in build/icons)
  const linuxSizes = [256, 512, 1024];
  console.log('Generating Linux PNG icons...');
  for (const size of linuxSizes) {
    const outPath = path.join(outputDir, `${size}x${size}.png`);
    execSync(`sips -z ${size} ${size} "${iconSource}" --out "${outPath}"`);
    console.log(`Generated ${size}x${size}.png`);
  }

  // Cleanup
  fs.rmSync(iconsetDir, { recursive: true, force: true });
  console.log('Cleaned up temporary files.');

} catch (error) {
  console.error('Error generating icons:', error.message);
  process.exit(1);
}
