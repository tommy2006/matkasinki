// Electron main process for Airport Cup.
// Runs the built Next.js server IN-PROCESS (uses the full node_modules next runtime,
// so there are no standalone-tracing gaps) and loads it in a native window.
// Ships/runs from a non-OneDrive location so the production .next output stays intact.

const { app, BrowserWindow, shell } = require("electron");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");
const fs = require("node:fs");

const isPackaged = app.isPackaged;
const APP_DIR = isPackaged ? path.join(process.resourcesPath, "app") : path.join(__dirname, "..");

// Load .env from the app dir so agent keys (ANTHROPIC_API_KEY, RESEND_API_KEY,
// OOO_DEFAULT_TO) reach the in-process Next server. Next's custom-server path
// does not reliably auto-load .env, so we do it explicitly. Real OS env wins.
function loadDotEnv(dir) {
  try {
    const raw = fs.readFileSync(path.join(dir, ".env"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!m) continue;
      let val = m[2];
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (val && !process.env[m[1]]) process.env[m[1]] = val;
    }
  } catch {
    /* no .env — fine, agents fall back to built-in data */
  }
}
loadDotEnv(APP_DIR);

// Football database path (env override -> packaged resource -> repo copy).
const PACKAGED_DB = path.join(process.resourcesPath, "open-football-database", "data");
const REPO_DB = path.join(APP_DIR, "data", "open-football-database", "data");
process.env.FOOTBALL_DB_DIR =
  process.env.FOOTBALL_DB_DIR ||
  (isPackaged && fs.existsSync(PACKAGED_DB) ? PACKAGED_DB : REPO_DB);
process.env.NODE_ENV = "production";

function findFreePort(start = 34120) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once("error", () => resolve(findFreePort(start + 1)));
    srv.listen(start, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

async function startNext(port) {
  const next = require(path.join(APP_DIR, "node_modules", "next"));
  const nextApp = next({ dev: false, dir: APP_DIR });
  await nextApp.prepare();
  const handle = nextApp.getRequestHandler();
  await new Promise((resolve) => {
    http.createServer((req, res) => handle(req, res)).listen(port, "127.0.0.1", resolve);
  });
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#0b0e14",
    show: false,
    title: "Matkasinki — HSL journey planner",
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  const port = await findFreePort();
  try {
    console.log(`[airport-cup] starting Next on 127.0.0.1:${port} — ANTHROPIC key loaded: ${!!process.env.ANTHROPIC_API_KEY}, RESEND key loaded: ${!!process.env.RESEND_API_KEY}`);
    await startNext(port);
    await win.loadURL(`http://127.0.0.1:${port}/discover`);
    console.log(`[airport-cup] window loaded: http://127.0.0.1:${port}/discover`);
  } catch (err) {
    console.error("[airport-cup] failed to start:", err);
    await win.loadURL(
      "data:text/html," +
        encodeURIComponent(
          `<body style="font-family:sans-serif;background:#0b0e14;color:#eef;padding:40px">
             <h1>Airport Cup failed to start</h1><pre>${String(err && err.stack)}</pre></body>`,
        ),
    );
  }
  win.show();
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
