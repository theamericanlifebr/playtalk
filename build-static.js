const fs = require('fs/promises');
const path = require('path');

const rootDir = __dirname;
const distDir = path.join(rootDir, 'dist');

const filesToCopy = ['index.html', 'play.html', 'custom.html'];
const directoriesToCopy = [
  'css',
  'js',
  'Audio',
  'data',
  'gamesounds',
  'selos modos de jogo',
  'selos_niveis'
];

async function removeDir(target) {
  await fs.rm(target, { recursive: true, force: true });
}

async function ensureDir(target) {
  await fs.mkdir(target, { recursive: true });
}

async function copyRecursive(source, destination) {
  const stats = await fs.stat(source);

  if (stats.isDirectory()) {
    await ensureDir(destination);
    const entries = await fs.readdir(source);
    for (const entry of entries) {
      await copyRecursive(path.join(source, entry), path.join(destination, entry));
    }
  } else {
    await ensureDir(path.dirname(destination));
    await fs.copyFile(source, destination);
  }
}

async function build() {
  console.log('Cleaning dist directory...');
  await removeDir(distDir);
  await ensureDir(distDir);

  for (const file of filesToCopy) {
    const source = path.join(rootDir, file);
    try {
      await copyRecursive(source, path.join(distDir, file));
      console.log(`Copied ${file}`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.warn(`File not found: ${file}, skipping.`);
      } else {
        throw error;
      }
    }
  }

  for (const directory of directoriesToCopy) {
    const source = path.join(rootDir, directory);
    try {
      await copyRecursive(source, path.join(distDir, directory));
      console.log(`Copied ${directory}/`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.warn(`Directory not found: ${directory}, skipping.`);
      } else {
        throw error;
      }
    }
  }

  console.log('Static build created at dist/.');
}

build().catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});
