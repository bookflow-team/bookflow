const { existsSync, readFileSync } = require('node:fs');
const { join } = require('node:path');

function loadTestEnv(file = join(__dirname, '..', '.env.test')) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (match) process.env[match[1]] = match[2];
  }
}

loadTestEnv();

module.exports = { loadTestEnv };
