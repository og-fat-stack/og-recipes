#!/usr/bin/env node
// `npm run storybook` — starts Storybook and watches alongside it:
//  - changes under .storybook/ restart the Storybook server (story/MDX edits
//    hot-reload on their own; config edits normally require a manual restart)
import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import { createServer } from 'node:net';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2); // extra flags go to `storybook dev`
const PORT = 6006;

let storybook = null;
let restarting = false;
let shuttingDown = false;

// storybook spawns its own children; detached puts them in one process group
// so killGroup() reaches the actual server, not just the npx wrapper.
function startStorybook() {
  storybook = spawn('npx', ['storybook', 'dev', '-p', String(PORT), ...args], {
    cwd: root,
    stdio: 'inherit',
    detached: true,
  });
  storybook.on('exit', async () => {
    if (shuttingDown) return;
    if (restarting) {
      restarting = false;
      await waitForPortFree(PORT, 15000);
      startStorybook();
    } else {
      shutdown(0);
    }
  });
}

function killGroup(proc, signal = 'SIGTERM') {
  if (!proc || proc.exitCode !== null) return;
  try {
    process.kill(-proc.pid, signal);
  } catch {
    try { proc.kill(signal); } catch {}
  }
}

function portFree(port) {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.once('error', () => resolve(false));
    srv.once('listening', () => srv.close(() => resolve(true)));
    srv.listen(port, '127.0.0.1');
  });
}

async function waitForPortFree(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await portFree(port)) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  console.log(`[storybook-dev] port ${port} still busy — force-killing old server…`);
  killGroup(storybook, 'SIGKILL');
  await new Promise((r) => setTimeout(r, 1000));
}

let timer = null;
watch(join(root, '.storybook'), (_event, filename) => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    console.log(`\n[storybook-dev] .storybook/${filename} changed — restarting Storybook…`);
    restarting = true;
    killGroup(storybook);
  }, 300);
});

function shutdown(code) {
  shuttingDown = true;
  killGroup(storybook);
  process.exit(code);
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

startStorybook();
