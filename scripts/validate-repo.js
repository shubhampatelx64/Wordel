const fs = require('fs');
const path = require('path');

const root = process.cwd();

function fail(message) {
  console.error(`VALIDATION ERROR: ${message}`);
  process.exitCode = 1;
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`Unable to parse JSON: ${filePath} (${error.message})`);
    return null;
  }
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath, files);
    else files.push(fullPath);
  }
  return files;
}

function validateNoConflictMarkers() {
  const markerPatterns = [/^<<<<<<<\s/m, /^=======\s*$/m, /^>>>>>>>\s/m];
  const files = walk(root);

  for (const file of files) {
    const rel = path.relative(root, file);
    const isBinaryLike = rel.endsWith('.png') || rel.endsWith('.jpg') || rel.endsWith('.jpeg') || rel.endsWith('.gif') || rel.endsWith('.db');
    if (isBinaryLike) continue;

    const content = fs.readFileSync(file, 'utf8');
    for (const pattern of markerPatterns) {
      if (pattern.test(content)) {
        fail(`Merge conflict marker found in ${rel}`);
        return;
      }
    }
  }
}

function validatePackageJson() {
  const filePath = path.join(root, 'package.json');
  if (!fs.existsSync(filePath)) {
    fail('package.json is missing');
    return;
  }

  const pkg = readJson(filePath);
  if (!pkg) return;

  if (!pkg.scripts || !pkg.scripts.start) {
    fail('package.json scripts.start is required');
  }

  if (!pkg.scripts || !pkg.scripts.check) {
    fail('package.json scripts.check is required');
  }
}

function validateCriticalFiles() {
  const required = ['server.js', '.github/workflows/ci.yml', 'README.md'];
  for (const rel of required) {
    if (!fs.existsSync(path.join(root, rel))) {
      fail(`Required file missing: ${rel}`);
    }
  }
}

validateCriticalFiles();
validatePackageJson();
validateNoConflictMarkers();

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log('Repository validation passed.');
