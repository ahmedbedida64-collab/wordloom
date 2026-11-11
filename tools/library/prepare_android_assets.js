const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../../');
const wwwDir = path.resolve(rootDir, 'www');

console.log('Preparing clean www/ bundle for Android build...');

// Clean existing www/
if (fs.existsSync(wwwDir)) {
  fs.rmSync(wwwDir, { recursive: true, force: true });
}
fs.mkdirSync(wwwDir, { recursive: true });

// Files to copy
const filesToCopy = [
  'index.html',
  'manifest.json',
  'sw.js',
  'icon.svg'
];

filesToCopy.forEach(file => {
  const src = path.join(rootDir, file);
  const dest = path.join(wwwDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`✓ Copied ${file}`);
  }
});

// Directories to copy
const dirsToCopy = [
  'icons',
  'covers'
];

dirsToCopy.forEach(dir => {
  const src = path.join(rootDir, dir);
  const dest = path.join(wwwDir, dir);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
    console.log(`✓ Copied directory ${dir}/`);
  }
});

console.log('Clean www/ bundle prepared successfully!');
