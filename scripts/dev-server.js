const { spawn } = require('child_process');
const os = require('os');
const path = require('path');

const port = 8080;
const page = 'html/web_stor.html';

console.log('\n=== Відкрий на телефоні (той самий Wi‑Fi) ===');
for (const addrs of Object.values(os.networkInterfaces())) {
  for (const addr of addrs) {
    if (addr.family === 'IPv4' && !addr.internal) {
      console.log(`  http://${addr.address}:${port}/${page}`);
    }
  }
}
console.log('=== Не закривай цей термінал, поки дивишся сайт ===\n');

const liveServer = path.join(__dirname, '..', 'node_modules', '.bin', 'live-server');
const child = spawn(
  liveServer,
  ['--host=0.0.0.0', `--port=${port}`, `--open=${page}`],
  { stdio: 'inherit', shell: true, cwd: path.join(__dirname, '..') }
);

child.on('exit', (code) => process.exit(code ?? 0));
