import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { stat, readdir } from "node:fs/promises";
import path from "node:path";

const execFileAsync = promisify(execFile);

const BACKUP_DIR =
  process.env.ARCONET_BACKUP_DIR || path.join(process.cwd(), "backups");

const BACKUP_EXTENSIONS = [".dump", ".sql", ".backup", ".gz", ".zip", ".bak"];

function toGB(bytes) {
  return Math.round((bytes / 1024 ** 3) * 10) / 10;
}

async function runPowerShell(command, timeout = 5000) {
  const { stdout } = await execFileAsync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", command],
    { timeout, windowsHide: true, maxBuffer: 1024 * 1024 },
  );
  return stdout.trim();
}

async function getCpuLoad() {
  const cores = os.cpus().length;
  const model = os.cpus()[0]?.model?.trim() || null;

  if (os.platform() === "win32") {
    try {
      const raw = await runPowerShell(
        "Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average | Select-Object -ExpandProperty Average",
      );
      const usage = Number(raw);
      if (Number.isFinite(usage)) {
        return { cores, model, usagePercent: Math.round(usage) };
      }
    } catch {}
  }

  const load = os.loadavg();
  return {
    cores,
    model,
    load1: Math.round(load[0] * 100) / 100,
    load5: Math.round(load[1] * 100) / 100,
    load15: Math.round(load[2] * 100) / 100,
    usagePercent: Math.min(100, Math.round((load[0] / Math.max(1, cores)) * 100)),
  };
}

function getMemory() {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  return {
    totalGB: toGB(total),
    usedGB: toGB(used),
    freeGB: toGB(free),
    usagePercent: total ? Math.round((used / total) * 100) : 0,
  };
}

async function getDisk() {
  try {
    if (os.platform() !== "win32") return null;
    const raw = await runPowerShell(
      "Get-CimInstance Win32_LogicalDisk -Filter \"DriveType=3\" | Select-Object DeviceID,Size,FreeSpace,VolumeName | ConvertTo-Json -Compress",
    );
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const disks = (Array.isArray(parsed) ? parsed : [parsed]).map((disk) => {
      const size = Number(disk.Size) || 0;
      const free = Number(disk.FreeSpace) || 0;
      const used = size - free;
      return {
        drive: String(disk.DeviceID || "").trim(),
        label: disk.VolumeName || null,
        totalGB: toGB(size),
        usedGB: toGB(used),
        freeGB: toGB(free),
        usagePercent: size ? Math.round((used / size) * 100) : 0,
      };
    });
    return disks;
  } catch {
    return null;
  }
}

async function listBackups() {
  try {
    const entries = await readdir(BACKUP_DIR, { withFileTypes: true });
    const files = entries.filter((entry) => entry.isFile());
    const backups = [];
    for (const file of files) {
      const ext = path.extname(file.name).toLowerCase();
      if (BACKUP_EXTENSIONS.length && !BACKUP_EXTENSIONS.includes(ext)) continue;
      try {
        const info = await stat(path.join(BACKUP_DIR, file.name));
        backups.push({
          name: file.name,
          sizeMB: Math.round((info.size / 1024 ** 2) * 10) / 10,
          modifiedAt: info.mtime.toISOString(),
        });
      } catch {}
    }
    backups.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));
    return { dir: BACKUP_DIR, available: true, files: backups };
  } catch (error) {
    return {
      dir: BACKUP_DIR,
      available: false,
      reason: error?.code === "ENOENT" ? "not-configured" : "unreadable",
      files: [],
    };
  }
}

function getProcess() {
  const mem = process.memoryUsage();
  return {
    nodeVersion: process.version,
    pid: process.pid,
    platform: os.platform(),
    uptimeSeconds: Math.round(process.uptime()),
    rssMB: Math.round((mem.rss / 1024 ** 2) * 10) / 10,
    heapUsedMB: Math.round((mem.heapUsed / 1024 ** 2) * 10) / 10,
    env: process.env.NODE_ENV || "development",
  };
}

export async function getSystemStatus() {
  const [disk, backups] = await Promise.all([getDisk(), listBackups()]);

  const mem = getMemory();
  const cpu = await getCpuLoad();

  const alerts = [];
  if (mem.usagePercent >= 90) alerts.push(`Memoria RAM al ${mem.usagePercent}%`);
  else if (mem.usagePercent >= 75) alerts.push(`Memoria RAM al ${mem.usagePercent}%`);
  if (disk) {
    for (const d of disk) {
      if (d.usagePercent >= 90) alerts.push(`Disco ${d.drive} al ${d.usagePercent}%`);
    }
  }
  if (!backups.available) alerts.push("Sin backups detectados");
  else if (backups.files.length === 0) alerts.push("Sin backups detectados");

  return {
    generatedAt: new Date().toISOString(),
    host: {
      hostname: os.hostname(),
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      uptimeSeconds: Math.round(os.uptime()),
    },
    cpu,
    memory: mem,
    disk,
    process: getProcess(),
    backups,
    alerts,
  };
}
