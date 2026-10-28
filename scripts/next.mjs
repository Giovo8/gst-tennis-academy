// Avvia `next <comando>` (dev, build) con Turbopack, oppure con Webpack se il compilatore
// nativo di Next non si carica. Succede su Windows con Smart App Control, che blocca il
// binario @next/swc-win32-x64-msvc finché non lo ritiene affidabile: Turbopack richiede il
// binario nativo, Webpack funziona anche con la versione WASM. Su altri sistemi (Vercel
// compreso) il comando passa invariato.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);

function isNativeSwcBlocked() {
  if (process.platform !== 'win32' || process.arch !== 'x64') return false;
  try {
    require('@next/swc-win32-x64-msvc');
    return false;
  } catch (error) {
    // Pacchetto non installato: decide Next, come senza questo script
    return error?.code !== 'MODULE_NOT_FOUND';
  }
}

if (!args.includes('--webpack') && !args.includes('--turbopack') && isNativeSwcBlocked()) {
  console.warn(
    '⚠ Compilatore nativo di Next bloccato da Windows (Smart App Control): uso Webpack invece di Turbopack.',
  );
  args.push('--webpack');
}

const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), ...args], {
  stdio: 'inherit',
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
