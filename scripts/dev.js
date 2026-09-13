/**
 * Single-command launcher for QAlibrate.
 *
 * Starts the FastAPI backend (using the Python interpreter inside
 * backend/venv) and the React frontend (via `npm run dev`) together,
 * streams both outputs into one terminal with colored [backend]/[frontend]
 * prefixes, and shuts both down cleanly on Ctrl+C.
 *
 * Usage (from the project root):
 *   npm run dev
 * or directly:
 *   node scripts/dev.js
 */

const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')
const readline = require('readline')
const net = require('net')

const ROOT = path.join(__dirname, '..')
const BACKEND_DIR = path.join(ROOT, 'backend')
const FRONTEND_DIR = path.join(ROOT, 'frontend')
const IS_WIN = process.platform === 'win32'

const COLORS = {
  backend: '\x1b[36m', // cyan
  frontend: '\x1b[35m', // magenta
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
}

function log(label, line) {
  const color = COLORS[label] || ''
  process.stdout.write(`${color}[${label}]${COLORS.reset} ${line}\n`)
}

function fail(message) {
  process.stderr.write(`${COLORS.red}✖ ${message}${COLORS.reset}\n`)
  process.exit(1)
}

// ---------- Pre-flight checks ----------

const venvDir = path.join(BACKEND_DIR, 'venv')
const venvPython = IS_WIN
  ? path.join(venvDir, 'Scripts', 'python.exe')
  : path.join(venvDir, 'bin', 'python')

if (!fs.existsSync(venvDir) || !fs.existsSync(venvPython)) {
  fail(
    'Backend virtual environment not found.\n\n' +
      '  Run the one-time setup first:\n' +
      '    cd backend\n' +
      '    python -m venv venv\n' +
      (IS_WIN ? '    venv\\Scripts\\activate\n' : '    source venv/bin/activate\n') +
      '    pip install -r requirements.txt\n\n' +
      '  See SETUP_GUIDE.md for full details.'
  )
}

if (!fs.existsSync(path.join(BACKEND_DIR, '.env'))) {
  process.stdout.write(
    `${COLORS.yellow}⚠ backend/.env not found — copy backend/.env.example to backend/.env and set your DATABASE_URL before continuing.${COLORS.reset}\n`
  )
}

if (!fs.existsSync(path.join(FRONTEND_DIR, 'node_modules'))) {
  fail(
    'Frontend dependencies not installed.\n\n' +
      '  Run the one-time setup first:\n' +
      '    cd frontend\n' +
      '    npm install\n\n' +
      '  See SETUP_GUIDE.md for full details.'
  )
}

// ---------- Start both processes ----------

process.stdout.write(`${COLORS.green}▶ Starting QAlibrate (backend + frontend)…${COLORS.reset}\n\n`)

const frontend = spawn('npm', ['run', 'dev'], {
  cwd: FRONTEND_DIR,
  shell: true,
})

function pipe(child, label) {
  const outRl = readline.createInterface({ input: child.stdout })
  const errRl = readline.createInterface({ input: child.stderr })
  outRl.on('line', (line) => log(label, line))
  errRl.on('line', (line) => log(label, line))
}

pipe(frontend, 'frontend')

let shuttingDown = false
let backend = null
let backendRestartTimer = null

function isBackendRunning() {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port: 8000 })
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('error', () => resolve(false))
  })
}

function startBackend() {
  backend = spawn(venvPython, ['-m', 'uvicorn', 'app.main:app'], {
    cwd: BACKEND_DIR,
  })
  pipe(backend, 'backend')
  backend.on('error', (error) => {
    if (!shuttingDown) log('backend', `process error: ${error.message}`)
  })
  backend.on('exit', (code, signal) => {
    if (shuttingDown) return
    log('backend', `process exited (code ${code ?? 'unknown'}, signal ${signal || 'none'}); restarting...`)
    backendRestartTimer = setTimeout(startBackend, 1000)
  })
}

function shutdown(code) {
  if (shuttingDown) return
  shuttingDown = true
  process.stdout.write(`\n${COLORS.yellow}◼ Stopping QAlibrate…${COLORS.reset}\n`)
  if (backendRestartTimer) clearTimeout(backendRestartTimer)
  if (backend) backend.kill()
  frontend.kill()
  setTimeout(() => process.exit(code || 0), 300)
}

frontend.on('exit', (code) => {
  if (!shuttingDown) {
    process.stderr.write(`${COLORS.red}✖ Frontend process exited unexpectedly (code ${code}).${COLORS.reset}\n`)
    shutdown(1)
  }
})

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

isBackendRunning().then((running) => {
  if (running) {
    log('backend', 'already running on http://127.0.0.1:8000; reusing it')
  } else {
    startBackend()
  }
})
