import fs from 'fs';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const configPath = 'src/pluginConfig.ts';
let config = fs.readFileSync(configPath, 'utf8');

config = config.replace(/version:\s*['"][^'"]+['"]/, `version: '${pkg.version}'`);
fs.writeFileSync(configPath, config);
console.log(`Synced ${configPath} version to ${pkg.version}`);
