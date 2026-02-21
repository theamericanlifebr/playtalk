const fs = require('fs/promises');
const path = require('path');

const rootDir = __dirname;
const sourceDir = path.join(rootDir, 'www');
const outputDir = path.join(rootDir, 'public');

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
  console.log('Cleaning public directory...');
  await removeDir(outputDir);
  await ensureDir(outputDir);

  try {
    await copyRecursive(sourceDir, outputDir);
    console.log('Copied www/ to public/.');
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn('Directory not found: www/, skipping.');
    } else {
      throw error;
    }
  }

  console.log('Static build created at public/.');
}

build().catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});
