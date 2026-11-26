const { spawn } = require('child_process');
const path = require('path');

console.log('========================================================');
console.log('  Starting Student Portal (Backend & Frontend)...');
console.log('  Backend:  http://localhost:4005');
console.log('  Frontend: http://localhost:3005');
console.log('========================================================');

const backend = spawn('node', ['server.js'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  shell: true
});

const frontend = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'frontend'),
  stdio: 'inherit',
  shell: true
});

process.on('SIGINT', () => {
  backend.kill();
  frontend.kill();
  process.exit();
});
