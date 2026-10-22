module.exports = {
  apps: [
    {
      name: 'arconet',
      // NOTA: antes era script: 'npm', args: 'start'. En Windows "npm"
      // resuelve a "C:\Program Files\nodejs\npm" (un script bash SIN
      // extension) que Windows abre con el Bloc de notas en vez de
      // ejecutarlo. Se llama directamente al binario de Next.js para que
      // PM2 supervise un unico proceso node.
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: 'C:\\arconet\\app',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 3000,
    },
  ],
};
