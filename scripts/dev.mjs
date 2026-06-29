#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const isWindows = process.platform === "win32";
const venvPython = path.join(
  projectRoot,
  ".venv",
  isWindows ? "Scripts/python.exe" : "bin/python",
);
function commandSupportsPython310(command) {
  const result = spawnSync(
    command,
    ["-c", "import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)"],
    { stdio: "ignore" },
  );
  return result.status === 0;
}

function resolvePython() {
  if (existsSync(venvPython)) {
    return venvPython;
  }

  if (process.env.PYTHON) {
    return process.env.PYTHON;
  }

  if (isWindows) {
    return "python";
  }

  for (const candidate of ["python3.11", "python3.10", "python3.12", "python3"]) {
    if (commandSupportsPython310(candidate)) {
      return candidate;
    }
  }

  return "python3";
}

const python = resolvePython();

const rawArgs = process.argv.slice(2);
let host = "127.0.0.1";
let port = "8000";
const passthroughArgs = [];

function readOptionValue(args, index, name) {
  const value = args[index + 1];
  if (!value || value.startsWith("-")) {
    console.error(`${name} requires a value.`);
    process.exit(1);
  }
  return value;
}

for (let index = 0; index < rawArgs.length; index += 1) {
  const arg = rawArgs[index];
  const normalized = arg.toLowerCase();

  if (arg === "--") {
    continue;
  }

  if (["-port", "--port"].includes(normalized)) {
    port = readOptionValue(rawArgs, index, arg);
    index += 1;
    continue;
  }

  if (normalized.startsWith("-port=") || normalized.startsWith("--port=")) {
    port = arg.slice(arg.indexOf("=") + 1);
    continue;
  }

  if (["-host", "--host", "-hostname", "--hostname"].includes(normalized)) {
    host = readOptionValue(rawArgs, index, arg);
    index += 1;
    continue;
  }

  if (
    normalized.startsWith("-host=") ||
    normalized.startsWith("--host=") ||
    normalized.startsWith("-hostname=") ||
    normalized.startsWith("--hostname=")
  ) {
    host = arg.slice(arg.indexOf("=") + 1);
    continue;
  }

  passthroughArgs.push(arg);
}

const child = spawn(
  python,
  [
    "-m",
    "uvicorn",
    "app.main:app",
    "--host",
    host,
    "--port",
    port,
    ...passthroughArgs,
  ],
  {
    cwd: projectRoot,
    stdio: "inherit",
  },
);

child.on("error", (error) => {
  if (error.code === "ENOENT") {
    console.error(
      `Python executable not found: ${python}. Create .venv or set the PYTHON environment variable.`,
    );
    process.exit(1);
  }

  console.error(error.message);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
