#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const LABEL = "me.lenol.toolbox";
const HOST = "127.0.0.1";
const PORT = 8000;
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = realpathSync(path.resolve(scriptDirectory, ".."));
const python = path.join(projectRoot, ".venv", "bin", "python");
const launchAgentsDirectory = path.join(os.homedir(), "Library", "LaunchAgents");
const logDirectory = path.join(os.homedir(), "Library", "Logs", "Toolbox");
const plistPath = path.join(launchAgentsDirectory, `${LABEL}.plist`);
const temporaryPlistPath = `${plistPath}.${process.pid}.tmp`;
const serviceTarget = `gui/${process.getuid()}/${LABEL}`;

if (process.platform !== "darwin") {
  fail("이 자동 실행 설치는 macOS에서만 지원합니다.");
}
if (!existsSync(python)) {
  fail(`${python}을 찾지 못했습니다. 먼저 Toolbox .venv를 설치하세요.`);
}

mkdirSync(launchAgentsDirectory, { recursive: true });
mkdirSync(logDirectory, { recursive: true });

const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${xmlEscape(python)}</string>
    <string>-m</string>
    <string>uvicorn</string>
    <string>app.main:app</string>
    <string>--host</string>
    <string>${HOST}</string>
    <string>--port</string>
    <string>${PORT}</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${xmlEscape(projectRoot)}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PYTHONUNBUFFERED</key>
    <string>1</string>
    <key>PYTORCH_ENABLE_MPS_FALLBACK</key>
    <string>1</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ProcessType</key>
  <string>Interactive</string>
  <key>ThrottleInterval</key>
  <integer>10</integer>
  <key>StandardOutPath</key>
  <string>${xmlEscape(path.join(logDirectory, "toolbox.out.log"))}</string>
  <key>StandardErrorPath</key>
  <string>${xmlEscape(path.join(logDirectory, "toolbox.err.log"))}</string>
</dict>
</plist>
`;

if (isServiceLoaded()) {
  try {
    execFileSync("/bin/launchctl", ["bootout", serviceTarget], { stdio: "pipe" });
    await waitForServiceUnload();
    await delay(250);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    fail(`기존 Toolbox 자동 실행을 내리지 못했습니다: ${detail}`);
  }
}

try {
  writeFileSync(temporaryPlistPath, plist, { encoding: "utf8", mode: 0o600 });
  renameSync(temporaryPlistPath, plistPath);
} finally {
  rmSync(temporaryPlistPath, { force: true });
}

let bootstrapError;
for (let attempt = 0; attempt < 6; attempt += 1) {
  try {
    execFileSync("/bin/launchctl", ["bootstrap", `gui/${process.getuid()}`, plistPath], {
      stdio: "pipe",
    });
    bootstrapError = undefined;
    break;
  } catch (error) {
    bootstrapError = error;
    await delay(250 * (attempt + 1));
  }
}
if (bootstrapError) {
  const detail = bootstrapError instanceof Error ? bootstrapError.message : String(bootstrapError);
  fail(`Toolbox 자동 실행을 등록하지 못했습니다: ${detail}`);
}

try {
  execFileSync("/bin/launchctl", ["kickstart", "-k", serviceTarget], { stdio: "pipe" });
} catch (error) {
  const detail = error instanceof Error ? error.message : String(error);
  fail(`Toolbox 자동 실행을 시작하지 못했습니다: ${detail}`);
}

if (!(await waitForToolbox())) {
  fail(
    `서비스는 등록했지만 상태 확인에 실패했습니다. ${path.join(logDirectory, "toolbox.err.log")}를 확인하세요.`,
  );
}

console.log(`Toolbox 자동 실행을 설치했습니다: ${plistPath}`);
console.log(`상태 URL: http://${HOST}:${PORT}/api/health`);

async function waitForToolbox() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const signal = AbortSignal.timeout(1500);
      const [health, models] = await Promise.all([
        fetch(`http://${HOST}:${PORT}/api/health`, { cache: "no-store", signal }),
        fetch(`http://${HOST}:${PORT}/api/models`, { cache: "no-store", signal }),
      ]);
      const healthPayload = await health.json();
      const modelsPayload = await models.json();
      if (
        health.ok
        && models.ok
        && healthPayload?.status === "ok"
        && modelsPayload?.quality_policy === "maximum"
      ) {
        return true;
      }
    } catch {
      // launchd may still be importing the local model runtime.
    }
    await delay(500);
  }
  return false;
}

async function waitForServiceUnload() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (!isServiceLoaded()) return;
    await delay(100);
  }
  fail("기존 Toolbox 자동 실행이 제한 시간 안에 종료되지 않았습니다.");
}

function isServiceLoaded() {
  try {
    execFileSync("/bin/launchctl", ["print", serviceTarget], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function xmlEscape(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
