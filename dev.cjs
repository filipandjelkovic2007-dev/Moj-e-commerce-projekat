const { spawn } = require('child_process');
const path = require('path');

const services = [
  { name: 'Product API', entry: path.join(__dirname, 'postman', 'mocks', 'mock.js') },
  { name: 'Website', entry: path.join(__dirname, 'serve.cjs') }
];

const children = [];
let stopping = false;

function stopChildren(signal = 'SIGTERM') {
  if (stopping) return;
  stopping = true;
  children.forEach((child) => {
    if (child.exitCode === null && !child.killed) {
      child.kill(signal);
    }
  });
}

services.forEach(({ name, entry }) => {
  const child = spawn(process.execPath, [entry], {
    cwd: __dirname,
    stdio: 'inherit'
  });
  children.push(child);

  child.on('error', (error) => {
    console.error(name + ' failed to start:', error);
    process.exitCode = 1;
    stopChildren();
  });

  child.on('exit', (code, signal) => {
    if (!stopping) {
      console.error(name + ' stopped unexpectedly' + (signal ? ' (' + signal + ')' : '.'));
      process.exitCode = code || 1;
      stopChildren();
    }
  });
});

process.on('SIGINT', () => {
  process.exitCode = 130;
  stopChildren('SIGINT');
});

process.on('SIGTERM', () => {
  process.exitCode = 143;
  stopChildren('SIGTERM');
});
