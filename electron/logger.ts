import { app } from 'electron'
import { join } from 'path'
import { mkdirSync, createWriteStream, writeFileSync, type WriteStream } from 'fs'
import { inspect } from 'util'

// Schlanker Logger: fängt die bestehenden console.*-Ausgaben des Main-Prozesses
// ab, hält die letzten Zeilen im Speicher (für die Anzeige unter Einstellungen →
// Entwickler) und schreibt sie zusätzlich in eine Logdatei in userData/logs.

const MAX_LINES = 500
const buffer: string[] = []
let stream: WriteStream | null = null
let logFilePath = ''

function record(level: string, args: unknown[]): void {
  const ts  = new Date().toISOString()
  const msg = args.map(a => (typeof a === 'string' ? a : inspect(a, { depth: 3 }))).join(' ')
  const line = `${ts} [${level}] ${msg}`
  buffer.push(line)
  if (buffer.length > MAX_LINES) buffer.shift()
  stream?.write(line + '\n')
}

function patch(method: 'log' | 'warn' | 'error', level: string): void {
  const orig = console[method].bind(console)
  console[method] = (...args: unknown[]) => {
    orig(...args)
    try { record(level, args) } catch { /* niemals wegen Logging crashen */ }
  }
}

export function initLogger(): void {
  if (stream) return
  const dir = join(app.getPath('userData'), 'logs')
  mkdirSync(dir, { recursive: true })
  logFilePath = join(dir, 'main.log')
  stream = createWriteStream(logFilePath, { flags: 'a' })

  patch('log',   'INFO')
  patch('warn',  'WARN')
  patch('error', 'ERROR')
}

export function getLogs(): string {
  return buffer.join('\n')
}

export function clearLogs(): void {
  buffer.length = 0
  if (logFilePath) writeFileSync(logFilePath, '')
}

export function getLogFilePath(): string {
  return logFilePath
}
