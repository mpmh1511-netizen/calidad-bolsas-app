import { spawn } from 'child_process';

console.log('Iniciando servidores de desarrollo...');

// Iniciar Express Backend
const backend = spawn('node', ['server/server.js'], { stdio: 'inherit', shell: true });

// Iniciar Vite Frontend
const frontend = spawn('npx', ['vite'], { stdio: 'inherit', shell: true });

process.on('SIGINT', () => {
  console.log('\nDeteniendo servidores...');
  backend.kill();
  frontend.kill();
  process.exit();
});
