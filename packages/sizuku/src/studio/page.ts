// The studio's one page: the schema on the left, its ER diagram on the right.
// Self-contained, so the package ships no client build and no extra dependency.
export const STUDIO_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>sizuku studio</title>
<style>
:root {
  --bg: #f7f8fb; --surface: #ffffff; --ink: #16181f; --muted: #6b7084; --line: #cfd3e0;
  --accent: #4f46e5; --danger: #b91c1c; --ok: #0f766e; --gutter: #9a9fb3; --header: #1f2233;
}
:root[data-theme="dark"] {
  --bg: #0f1117; --surface: #171a23; --ink: #e6e8ef; --muted: #9aa0b4; --line: #343a4a;
  --accent: #7c74ff; --danger: #f87171; --ok: #5eead4; --gutter: #6b7189; --header: #2a2f45;
}
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; }
body {
  display: flex; flex-direction: column; background: var(--bg); color: var(--ink);
  font: 13px/1.4 ui-sans-serif, -apple-system, "Segoe UI", Roboto, sans-serif;
}
header {
  display: flex; align-items: center; gap: 12px; padding: 8px 14px;
  background: var(--header); color: #f4f5fa;
}
header h1 { margin: 0; font-size: 14px; font-weight: 600; }
#file { font-family: ui-monospace, Menlo, Consolas, monospace; opacity: .75; }
#status { margin-left: 4px; font-size: 12px; opacity: .85; }
#status.dirty { color: #fbbf24; } #status.error { color: #f87171; } #status.saved { color: #5eead4; }
.spacer { flex: 1; }
button {
  font: inherit; color: inherit; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.18);
  border-radius: 6px; padding: 4px 10px; cursor: pointer;
}
button:hover { background: rgba(255,255,255,.16); }
button.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
main { flex: 1; display: flex; min-height: 0; }
#editor-pane { display: flex; width: 42%; min-width: 240px; background: var(--surface); }
#gutter {
  margin: 0; padding: 12px 8px 12px 12px; text-align: right; color: var(--gutter); user-select: none;
  overflow: hidden; border-right: 1px solid var(--line);
}
#gutter, #source { font: 12.5px/1.6 ui-monospace, "SF Mono", Menlo, Consolas, monospace; }
#source {
  flex: 1; margin: 0; padding: 12px; border: 0; outline: 0; resize: none; white-space: pre;
  overflow: auto; background: transparent; color: var(--ink); tab-size: 2;
}
#splitter { width: 5px; cursor: col-resize; background: var(--line); }
#splitter:hover, #splitter.active { background: var(--accent); }
#preview-pane { position: relative; flex: 1; overflow: hidden; cursor: grab; }
#preview-pane.panning { cursor: grabbing; }
#canvas { position: absolute; left: 0; top: 0; transform-origin: 0 0; }
#canvas svg { display: block; }
#error {
  position: absolute; left: 12px; right: 12px; bottom: 12px; display: none; padding: 8px 12px;
  border-radius: 6px; background: var(--surface); color: var(--danger); border: 1px solid var(--danger);
  font-family: ui-monospace, Menlo, Consolas, monospace; white-space: pre-wrap;
}
#banner {
  display: none; align-items: center; gap: 10px; padding: 6px 14px;
  background: #fef3c7; color: #78350f;
}
#zoom {
  position: absolute; right: 12px; top: 12px; padding: 2px 8px; border-radius: 6px;
  background: var(--surface); color: var(--muted); border: 1px solid var(--line); font-size: 12px;
}
@media (max-width: 720px) {
  main { flex-direction: column; }
  #editor-pane { width: 100% !important; height: 45%; min-width: 0; }
  #splitter { display: none; }
}
</style>
</head>
<body>
<header>
  <h1>💧 sizuku studio</h1>
  <span id="file"></span>
  <span id="status"></span>
  <span class="spacer"></span>
  <button id="fit" title="Fit the diagram to the pane">Fit</button>
  <button id="theme" title="Toggle light / dark">Theme</button>
  <button id="svg">Export SVG</button>
  <button id="png">Export PNG</button>
  <button id="save" class="primary" title="Ctrl/Cmd + S">Save</button>
</header>
<div id="banner"><span>The file changed on disk.</span><button id="reload">Reload it</button></div>
<main>
  <section id="editor-pane">
    <pre id="gutter">1</pre>
    <textarea id="source" spellcheck="false" autocomplete="off" autocapitalize="off"></textarea>
  </section>
  <div id="splitter"></div>
  <section id="preview-pane">
    <div id="canvas"></div>
    <div id="zoom">100%</div>
    <div id="error"></div>
  </section>
</main>
<script>
const $ = (id) => document.getElementById(id);
const source = $("source"), gutter = $("gutter"), canvas = $("canvas"), pane = $("preview-pane");
const state = { saved: "", theme: "light", svg: "", view: { x: 0, y: 0, scale: 1 }, fitted: false, timer: 0, seq: 0 };

try {
  state.theme = localStorage.getItem("sizuku-theme") ||
    (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
} catch { /* storage may be unavailable */ }
document.documentElement.dataset.theme = state.theme;

function setStatus(text, kind) {
  const el = $("status");
  el.textContent = text;
  el.className = kind || "";
}

function dirty() { return source.value !== state.saved; }

function refreshStatus() {
  if (dirty()) setStatus("● unsaved", "dirty");
  else setStatus("saved", "saved");
}

function updateGutter() {
  const lines = source.value.split("\\n").length;
  let text = "";
  for (let i = 1; i <= lines; i++) text += i + "\\n";
  gutter.textContent = text;
  gutter.scrollTop = source.scrollTop;
}

function applyView() {
  const { x, y, scale } = state.view;
  canvas.style.transform = "translate(" + x + "px," + y + "px) scale(" + scale + ")";
  $("zoom").textContent = Math.round(scale * 100) + "%";
}

function fit() {
  const svg = canvas.querySelector("svg");
  if (!svg) return;
  const w = Number(svg.getAttribute("width")), h = Number(svg.getAttribute("height"));
  const scale = Math.min(pane.clientWidth / w, pane.clientHeight / h, 1.5) * 0.95;
  state.view = { scale, x: (pane.clientWidth - w * scale) / 2, y: (pane.clientHeight - h * scale) / 2 };
  applyView();
}

async function render() {
  const seq = ++state.seq;
  const res = await fetch("/api/render", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ source: source.value, theme: state.theme }),
  });
  const body = await res.json();
  if (seq !== state.seq) return; // a newer edit has been sent
  if (body.error) {
    $("error").textContent = body.error;
    $("error").style.display = "block";
    return;
  }
  $("error").style.display = "none";
  state.svg = body.svg;
  canvas.innerHTML = body.svg;
  if (!state.fitted) { state.fitted = true; fit(); }
}

function scheduleRender() {
  clearTimeout(state.timer);
  state.timer = setTimeout(render, 250);
}

async function load() {
  const res = await fetch("/api/schema");
  const body = await res.json();
  if (body.error) { setStatus(body.error, "error"); return; }
  $("file").textContent = body.file;
  document.title = body.file + " — sizuku studio";
  source.value = body.source;
  state.saved = body.source;
  $("banner").style.display = "none";
  updateGutter();
  refreshStatus();
  await render();
}

async function save() {
  const text = source.value;
  const res = await fetch("/api/schema", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ source: text }),
  });
  const body = await res.json();
  if (body.error) { setStatus("save failed: " + body.error, "error"); return; }
  state.saved = text;
  refreshStatus();
}

function download(name, blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

source.addEventListener("input", () => { updateGutter(); refreshStatus(); scheduleRender(); });
source.addEventListener("scroll", () => { gutter.scrollTop = source.scrollTop; });
source.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    document.execCommand("insertText", false, "  ");
  }
});
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); save(); }
});
window.addEventListener("beforeunload", (e) => { if (dirty()) e.preventDefault(); });

$("save").onclick = save;
$("fit").onclick = fit;
$("reload").onclick = load;
$("theme").onclick = () => {
  state.theme = state.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = state.theme;
  try { localStorage.setItem("sizuku-theme", state.theme); } catch { /* ignore */ }
  render();
};
$("svg").onclick = () => {
  if (state.svg) download("er.svg", new Blob([state.svg], { type: "image/svg+xml" }));
};
$("png").onclick = async () => {
  const res = await fetch("/api/png", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ source: source.value, theme: state.theme }),
  });
  if (res.ok) download("er.png", await res.blob());
};

// Pan by dragging, zoom with the wheel around the pointer.
let drag = null;
pane.addEventListener("pointerdown", (e) => {
  drag = { x: e.clientX - state.view.x, y: e.clientY - state.view.y };
  pane.classList.add("panning");
  pane.setPointerCapture(e.pointerId);
});
pane.addEventListener("pointermove", (e) => {
  if (!drag) return;
  state.view.x = e.clientX - drag.x;
  state.view.y = e.clientY - drag.y;
  applyView();
});
pane.addEventListener("pointerup", () => { drag = null; pane.classList.remove("panning"); });
pane.addEventListener("wheel", (e) => {
  e.preventDefault();
  const rect = pane.getBoundingClientRect();
  const px = e.clientX - rect.left, py = e.clientY - rect.top;
  const next = Math.min(4, Math.max(0.1, state.view.scale * Math.exp(-e.deltaY * 0.0015)));
  const k = next / state.view.scale;
  state.view = { scale: next, x: px - (px - state.view.x) * k, y: py - (py - state.view.y) * k };
  applyView();
}, { passive: false });

// Drag the splitter to resize the editor.
const splitter = $("splitter");
splitter.addEventListener("pointerdown", (e) => {
  splitter.classList.add("active");
  splitter.setPointerCapture(e.pointerId);
  const move = (ev) => { $("editor-pane").style.width = Math.max(240, ev.clientX) + "px"; };
  const up = () => {
    splitter.classList.remove("active");
    splitter.removeEventListener("pointermove", move);
    splitter.removeEventListener("pointerup", up);
  };
  splitter.addEventListener("pointermove", move);
  splitter.addEventListener("pointerup", up);
});

// A change on disk reloads a clean editor, and asks before replacing unsaved work.
new EventSource("/api/events").addEventListener("change", async () => {
  const res = await fetch("/api/schema");
  const body = await res.json();
  if (body.error || body.source === source.value || body.source === state.saved) return;
  if (dirty()) { $("banner").style.display = "flex"; return; }
  load();
});

load();
</script>
</body>
</html>
`;
