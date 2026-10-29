const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

console.log('==================================================================');
console.log(' Starting Aetheria Institute & Networking Academy LMS (Local Mode)');
console.log(' - Backend API : http://localhost:5000/api');
console.log(' - Frontend UI : http://localhost:5173');
console.log('==================================================================\n');

const serverProc = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.resolve(__dirname, '../server'),
  stdio: 'inherit',
  shell: isWin,
});

let clientProc = null;

function waitForBackendReady(retries = 60) {
  const req = http.get('http://127.0.0.1:5000/api/health', (res) => {
    res.resume();
    if (!clientProc) {
      clientProc = spawn(npmCmd, ['run', 'dev'], {
        cwd: path.resolve(__dirname, '../client'),
        stdio: 'inherit',
        shell: isWin,
      });
    }
  });

  req.on('error', () => {
    if (retries > 0) {
      setTimeout(() => waitForBackendReady(retries - 1), 300);
    } else if (!clientProc) {
      clientProc = spawn(npmCmd, ['run', 'dev'], {
        cwd: path.resolve(__dirname, '../client'),
        stdio: 'inherit',
        shell: isWin,
      });
    }
  });
}

waitForBackendReady();

function shutdown() {
  if (serverProc) serverProc.kill();
  if (clientProc) clientProc.kill();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
