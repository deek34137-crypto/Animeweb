const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getVersion() {
  // 1. Vercel deployment commit SHA
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    console.log(`[PWA Version] Using Vercel commit SHA: ${process.env.VERCEL_GIT_COMMIT_SHA}`);
    return process.env.VERCEL_GIT_COMMIT_SHA.substring(0, 7);
  }

  // 2. GitHub Actions commit SHA
  if (process.env.GITHUB_SHA) {
    console.log(`[PWA Version] Using GitHub commit SHA: ${process.env.GITHUB_SHA}`);
    return process.env.GITHUB_SHA.substring(0, 7);
  }

  // 3. Local Git commit SHA
  try {
    const gitSha = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    if (gitSha) {
      console.log(`[PWA Version] Using local Git commit SHA: ${gitSha}`);
      return gitSha;
    }
  } catch (err) {
    // Ignore error and fall through
  }

  // 4. Package.json version + build fallback
  try {
    const pkgPath = path.join(__dirname, '../package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const fallbackId = `pkg-${pkg.version}-${Date.now().toString().slice(-6)}`;
      console.log(`[PWA Version] Git unavailable. Using package version fallback: ${fallbackId}`);
      return fallbackId;
    }
  } catch (err) {
    // Ignore error and fall through
  }

  // 5. Random fallback build ID
  const randomId = `build-${Math.random().toString(36).substring(2, 9)}`;
  console.log(`[PWA Version] Using random fallback build ID: ${randomId}`);
  return randomId;
}

function updateFiles() {
  const version = getVersion();

  // Update sw.js
  const swPath = path.join(__dirname, '../public/sw.js');
  if (fs.existsSync(swPath)) {
    let swContent = fs.readFileSync(swPath, 'utf-8');
    // Replace const CACHE_VERSION = '...';
    swContent = swContent.replace(
      /const CACHE_VERSION\s*=\s*['"`][^'"`]+['"`];/,
      `const CACHE_VERSION = '${version}';`
    );
    fs.writeFileSync(swPath, swContent, 'utf-8');
    console.log(`[PWA Version] Updated sw.js with Cache Version: ${version}`);
  } else {
    console.error(`[PWA Version] Error: sw.js not found at ${swPath}`);
  }

  // Update offline.html
  const offlinePath = path.join(__dirname, '../public/offline.html');
  if (fs.existsSync(offlinePath)) {
    let offlineContent = fs.readFileSync(offlinePath, 'utf-8');
    // Replace Cache version: ...
    offlineContent = offlineContent.replace(
      /Cache version:\s*[^\s<]+/g,
      `Cache version: ${version}`
    );
    fs.writeFileSync(offlinePath, offlineContent, 'utf-8');
    console.log(`[PWA Version] Updated offline.html with Cache Version: ${version}`);
  } else {
    console.error(`[PWA Version] Error: offline.html not found at ${offlinePath}`);
  }
}

updateFiles();
