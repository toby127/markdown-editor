// 固定目录本地打包：始终输出到 Downloads/markdown-editor-local，不再另开新目录。
// 打包前检测该目录内是否有正在运行的应用进程；若有则提示关闭并中止，避免覆盖失败。
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const OUTPUT = 'C:/Users/85054/Downloads/markdown-editor-local'
const targetDir = path.resolve(OUTPUT).replace(/\//g, '\\') + '\\'

function findLockingProcesses() {
  if (process.platform !== 'win32') return []
  const ps = [
    "$t = '" + targetDir + "'",
    "@(Get-CimInstance Win32_Process | Where-Object {",
    "  $_.ExecutablePath -and $_.ExecutablePath.ToLower().StartsWith($t.ToLower())",
    "} | Select-Object ProcessId,Name,ExecutablePath | ConvertTo-Json -Compress)"
  ].join(' ')
  const r = spawnSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8' })
  if (r.status !== 0 || !r.stdout || !r.stdout.trim()) return []
  try {
    const data = JSON.parse(r.stdout.trim())
    return Array.isArray(data) ? data : [data]
  } catch {
    return []
  }
}

const locking = findLockingProcesses()
if (locking.length > 0) {
  console.error('[pack] 输出目录中的应用仍在运行，无法覆盖。请先关闭应用再重新打包。')
  console.error('[pack] 为保持目录固定，脚本不会改用其它目录。占用进程：')
  for (const p of locking) {
    console.error(`  - PID ${p.ProcessId}  ${p.Name}  ${p.ExecutablePath}`)
  }
  process.exit(1)
}

console.log(`[pack] 输出到固定目录：${OUTPUT}`)
fs.mkdirSync(OUTPUT, { recursive: true })

const builder = path.resolve('node_modules/.bin/electron-builder' + (process.platform === 'win32' ? '.cmd' : ''))
const args = ['--win', `-c.directories.output=${OUTPUT}`]
const r = spawnSync(builder, args, { stdio: 'inherit', shell: process.platform === 'win32' })
if (r.status !== 0) {
  console.error('[pack] 打包失败。若报 Access is denied / EnsureEmptyDir，请确认目录内应用已全部关闭。')
  process.exit(r.status ?? 1)
}

// 验证 asar 中确实包含最新产物标记
const asar = path.join(OUTPUT, 'win-unpacked', 'resources', 'app.asar')
try {
  fs.accessSync(asar)
  console.log(`[pack] 完成：${asar}`)
} catch {
  console.error('[pack] 未找到 app.asar，请检查打包结果。')
  process.exit(1)
}
