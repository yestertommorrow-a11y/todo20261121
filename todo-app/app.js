const $ = id => document.getElementById(id);
const PRIORITY_RANK = { High: 0, Medium: 1, Low: 2 };
const REPEATS = ["daily", "weekly", "monthly"];

// ---------- storage ----------
// Opening index.html#demo uses separate demo storage, so mockups never touch your real list
const NS = location.hash === "#demo" ? "demo:" : "";
function load(key, fallback) {
  try {
    const v = localStorage.getItem(NS + key);
    return v ? JSON.parse(v) : fallback;
  } catch (e) { return fallback; }
}
function store(key, value) {
  try { localStorage.setItem(NS + key, JSON.stringify(value)); } catch (e) {}
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Makes any object (old saved item, imported item, form data) a clean item
function normalize(t) {
  return {
    id: t.id || newId(),
    item: String(t.item || "").trim(),
    priority: t.priority in PRIORITY_RANK ? t.priority : "Medium",
    deadline: /^\d{4}-\d{2}-\d{2}$/.test(t.deadline) ? t.deadline : "",
    requestedBy: String(t.requestedBy || "").trim(),
    category: String(t.category || "").trim(),
    notes: String(t.notes || "").trim(),
    repeat: REPEATS.includes(t.repeat) ? t.repeat : "",
    done: !!t.done,
    nextId: t.nextId || ""
  };
}

let items = load("items", [])
  .filter(t => t && typeof t === "object")
  .map(normalize)
  .filter(t => t.item);
let editId = null;
const view = { search: "", status: "all", requester: "", category: "" };

function save() { store("items", items); }
save(); // saves old items again with the new fields

// ---------- dates ----------
const pad = n => String(n).padStart(2, "0");
const toISO = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
function fromISO(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function daysUntil(s) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((fromISO(s) - today) / 864e5);
}

// 1. Overdue / due today / due tomorrow
function dueStatus(t) {
  if (t.done || !t.deadline) return null;
  const n = daysUntil(t.deadline);
  if (n < 0) return { cls: "over", text: n === -1 ? "1 day overdue" : -n + " days overdue" };
  if (n === 0) return { cls: "today", text: "Today" };
  if (n === 1) return { cls: "soon", text: "Tomorrow" };
  return null;
}

// 13. Next date for a repeating item (always lands today or later)
function nextDeadline(t) {
  const today = toISO(new Date());
  const d = fromISO(t.deadline || today);
  for (let i = 0; i < 500; i++) {
    if (t.repeat === "daily") d.setDate(d.getDate() + 1);
    else if (t.repeat === "weekly") d.setDate(d.getDate() + 7);
    else {
      const day = d.getDate();
      d.setDate(1);
      d.setMonth(d.getMonth() + 1);
      d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
    }
    if (toISO(d) >= today) break;
  }
  return toISO(d);
}

// ---------- 2. sort: open first, nearest deadline, then priority ----------
function compare(a, b) {
  if (a.done !== b.done) return a.done ? 1 : -1;
  if (a.deadline !== b.deadline) {
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return a.deadline < b.deadline ? -1 : 1;
  }
  return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
}

// ---------- 6 + 7. search and filters ----------
function visibleItems() {
  const q = view.search.trim().toLowerCase();
  return items.filter(t => {
    if (view.status === "open" && t.done) return false;
    if (view.status === "done" && !t.done) return false;
    if (view.status === "high" && (t.done || t.priority !== "High")) return false;
    if (view.requester && t.requestedBy !== view.requester) return false;
    if (view.category && t.category !== view.category) return false;
    if (q && ![t.item, t.requestedBy, t.category, t.notes].join(" ").toLowerCase().includes(q)) return false;
    return true;
  }).sort(compare);
}

function fillFilter(select, values, key) {
  const unique = [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  if (view[key] && !unique.includes(view[key])) view[key] = "";
  select.innerHTML = "";
  select.appendChild(new Option(select.dataset.all, ""));
  unique.forEach(v => select.appendChild(new Option(v, v)));
  select.value = view[key];
}

// ---------- 9. toast with undo ----------
let toastTimer;
function snapshot() { return JSON.stringify(items); }
function hideToast() { $("toast").hidden = true; }
function showToast(msg, snap) {
  $("toastMsg").textContent = msg;
  $("toastUndo").hidden = !snap;
  $("toastUndo").onclick = () => {
    items = JSON.parse(snap);
    save();
    render();
    hideToast();
  };
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 6000);
}

// ---------- actions ----------
function toggleDone(t) {
  t.done = !t.done;
  if (t.done && t.repeat && !t.nextId) {
    // 13. repeating: create the next occurrence
    const copy = normalize({ ...t, id: "", done: false, deadline: nextDeadline(t), nextId: "" });
    t.nextId = copy.id;
    items.push(copy);
  } else if (!t.done && t.nextId) {
    // undo: remove the occurrence we created, if it is still untouched
    items = items.filter(x => !(x.id === t.nextId && !x.done));
    t.nextId = "";
  }
  save();
  render();
}

// 4. confirm, plus 9. undo
function removeItem(t) {
  if (!confirm('Delete "' + t.item + '"?')) return;
  const snap = snapshot();
  items = items.filter(x => x !== t);
  if (editId === t.id) cancelEdit();
  save();
  render();
  showToast("Item deleted", snap);
}

function startEdit(t) {
  editId = t.id;
  $("item").value = t.item;
  $("priority").value = t.priority;
  $("deadline").value = t.deadline;
  $("requestedBy").value = t.requestedBy;
  $("category").value = t.category;
  $("repeat").value = t.repeat;
  $("notes").value = t.notes;
  $("submit").textContent = "Save";
  $("cancel").hidden = false;
  $("formCard").classList.add("editing");
  $("formCard").scrollIntoView({ behavior: "smooth", block: "start" });
  $("item").focus();
}

function cancelEdit() {
  editId = null;
  $("form").reset();
  $("deadline").value = toISO(new Date()); // new items default to today
  $("submit").textContent = "Add";
  $("cancel").hidden = true;
  $("formCard").classList.remove("editing");
}

$("cancel").onclick = cancelEdit;
$("deadline").value = toISO(new Date());

$("form").onsubmit = e => {
  e.preventDefault();
  const data = {
    item: $("item").value,
    priority: $("priority").value,
    deadline: $("deadline").value,
    requestedBy: $("requestedBy").value,
    category: $("category").value,
    repeat: $("repeat").value,
    notes: $("notes").value
  };
  if (!data.item.trim()) return;
  const existing = editId && items.find(x => x.id === editId);
  if (existing) Object.assign(existing, normalize({ ...existing, ...data }));
  else items.push(normalize(data));
  cancelEdit();
  save();
  render();
};

// ---------- rendering ----------
function iconButton(icon, label, onclick) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = icon;
  b.title = label;
  b.setAttribute("aria-label", label);
  b.onclick = onclick;
  return b;
}

function valueCell(label, content, cls) {
  const td = document.createElement("td");
  td.dataset.label = label;
  const span = document.createElement("span");
  span.className = "val" + (cls ? " " + cls : "");
  span.append(content);
  td.appendChild(span);
  return td;
}

function div(cls, text) {
  const d = document.createElement("div");
  d.className = cls;
  d.textContent = text;
  return d;
}

function buildRow(t) {
  const status = dueStatus(t);
  const tr = document.createElement("tr");
  if (t.done) tr.className = "done";
  else if (status && status.cls === "over") tr.className = "over";

  // Item (+ 11. notes, 12. category, 13. repeat marker)
  const itemTd = document.createElement("td");
  itemTd.dataset.label = "Item";
  const title = div("title", t.item + (t.repeat ? " 🔁" : ""));
  if (t.repeat) title.title = "Repeats " + t.repeat;
  itemTd.appendChild(title);
  if (t.notes) itemTd.appendChild(div("notes", t.notes));
  if (t.category) {
    const cat = document.createElement("span");
    cat.className = "cat";
    cat.textContent = t.category;
    itemTd.appendChild(cat);
  }
  tr.appendChild(itemTd);

  const badge = document.createElement("span");
  badge.className = "badge p-" + t.priority;
  badge.textContent = t.priority;
  tr.appendChild(valueCell("Priority", badge));

  const dl = document.createElement("span");
  dl.append(t.deadline || "—");
  if (status) {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = status.text;
    dl.appendChild(tag);
  }
  tr.appendChild(valueCell("Deadline", dl, status ? "due-" + status.cls : ""));

  tr.appendChild(valueCell("Requested by", t.requestedBy || "—"));

  const actions = document.createElement("td");
  actions.className = "actions-cell";
  actions.appendChild(iconButton(t.done ? "↩️" : "✅", t.done ? "Undo" : "Done", () => toggleDone(t)));
  actions.appendChild(iconButton("✏️", "Edit", () => startEdit(t)));
  actions.appendChild(iconButton("🗑️", "Delete", () => removeItem(t)));
  tr.appendChild(actions);
  return tr;
}

function dueCounts() {
  let over = 0, today = 0;
  items.forEach(t => {
    const s = dueStatus(t);
    if (!s) return;
    if (s.cls === "over") over++;
    else if (s.cls === "today") today++;
  });
  return { over, today };
}
function summaryText(c) {
  const parts = [];
  if (c.over) parts.push(c.over + " overdue");
  if (c.today) parts.push(c.today + " due today");
  return parts.join(" · ");
}

function render() {
  fillFilter($("fRequester"), items.map(t => t.requestedBy), "requester");
  fillFilter($("fCategory"), items.map(t => t.category), "category");

  const cats = [...new Set(["Work", "Home", "Errands", ...items.map(t => t.category)].filter(Boolean))];
  $("categories").innerHTML = "";
  cats.forEach(c => $("categories").appendChild(new Option(c)));

  document.querySelectorAll(".chip").forEach(b =>
    b.classList.toggle("active", b.dataset.status === view.status));

  const visible = visibleItems();
  const list = $("list");
  list.innerHTML = "";
  visible.forEach(t => list.appendChild(buildRow(t)));

  // 3. empty state
  const empty = $("empty");
  empty.hidden = visible.length > 0;
  if (!visible.length) {
    empty.textContent = items.length ? "No items match your search or filters." : "Nothing to do 🎉 Add your first item above.";
  }
  document.querySelector("table").hidden = visible.length === 0;

  // 5. counter
  const open = items.filter(t => !t.done).length;
  const done = items.length - open;
  $("count").textContent = open + " open · " + done + " done";
  $("clearDone").disabled = done === 0;

  // 14. in-page reminder bar (works everywhere, even without notifications)
  const text = summaryText(dueCounts());
  $("alert").hidden = !text;
  $("alert").textContent = text ? "⚠️ " + text : "";

  checkReminders();
}

// ---------- filter controls ----------
$("search").oninput = e => { view.search = e.target.value; render(); };
$("chips").onclick = e => {
  const b = e.target.closest(".chip");
  if (!b) return;
  view.status = b.dataset.status;
  render();
};
$("fRequester").onchange = e => { view.requester = e.target.value; render(); };
$("fCategory").onchange = e => { view.category = e.target.value; render(); };

// ---------- 8. clear completed ----------
$("clearDone").onclick = () => {
  const n = items.filter(t => t.done).length;
  if (!n) return;
  if (!confirm("Remove " + n + " completed item" + (n === 1 ? "" : "s") + "?")) return;
  const snap = snapshot();
  items = items.filter(t => !t.done);
  save();
  render();
  showToast(n + " completed item" + (n === 1 ? "" : "s") + " removed", snap);
};

// ---------- 10. export / import ----------
function download(name, text, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

$("exportJson").onclick = () =>
  download("todo-" + toISO(new Date()) + ".json", JSON.stringify(items, null, 2), "application/json");

function csvCell(v) {
  let s = String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s; // stop spreadsheets running text as a formula
  return '"' + s.replace(/"/g, '""') + '"';
}

$("exportCsv").onclick = () => {
  const head = ["Item", "Priority", "Deadline", "Requested by", "Category", "Repeat", "Notes", "Done"];
  const rows = items.slice().sort(compare).map(t =>
    [t.item, t.priority, t.deadline, t.requestedBy, t.category, t.repeat, t.notes, t.done ? "Yes" : "No"]);
  const csv = [head, ...rows].map(r => r.map(csvCell).join(",")).join("\r\n");
  download("todo-" + toISO(new Date()) + ".csv", "﻿" + csv, "text/csv;charset=utf-8");
};

$("importBtn").onclick = () => $("importFile").click();
$("importFile").onchange = e => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data)) throw new Error("not a list");
      const snap = snapshot();
      const added = data
        .filter(x => x && typeof x === "object")
        .map(x => normalize({ ...x, id: "", nextId: "" }))
        .filter(x => x.item);
      items = items.concat(added); // adds to your list, nothing is overwritten
      save();
      render();
      showToast("Imported " + added.length + " item" + (added.length === 1 ? "" : "s"), snap);
    } catch (err) {
      showToast("Couldn't read that file. Choose a JSON file exported from this app.");
    }
  };
  reader.readAsText(file);
};

// ---------- 14. browser notifications ----------
const bell = $("bell");
function showBell() {
  if (!("Notification" in window)) { bell.hidden = true; return; }
  bell.hidden = false;
  const p = Notification.permission;
  bell.textContent = p === "granted" ? "🔔" : "🔕";
  bell.title = p === "granted" ? "Reminders are on"
    : p === "denied" ? "Notifications are blocked in browser settings"
    : "Turn on deadline reminders";
}

function checkReminders() {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const text = summaryText(dueCounts());
  const today = toISO(new Date());
  if (!text || load("lastNotified", "") === today) return;
  try {
    new Notification("To-Do Tracker", { body: text });
    store("lastNotified", today);
  } catch (e) { /* some mobile browsers only allow notifications from installed apps */ }
}

bell.onclick = async () => {
  if (Notification.permission === "default") {
    try { await Notification.requestPermission(); } catch (e) {}
    showBell();
    checkReminders();
  } else if (Notification.permission === "denied") {
    showToast("Notifications are blocked. Allow them in your browser's site settings.");
  } else {
    showToast("Reminders on: one alert a day for overdue and due-today items while this page is open.");
  }
};

// ---------- light/dark toggle ----------
const themeBtn = $("theme");
const themeMeta = document.querySelector('meta[name="theme-color"]');

function showTheme() {
  const dark = document.documentElement.dataset.theme === "dark";
  themeBtn.textContent = dark ? "☀️" : "🌙";
  themeBtn.title = dark ? "Switch to light mode" : "Switch to dark mode";
  themeMeta.content = dark ? "#0f1117" : "#f4f5fb";
}

themeBtn.onclick = () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem("theme", next); } catch (e) {}
  showTheme();
};

// ---------- start ----------
showTheme();
showBell();
render();
// refresh statuses when you come back to the tab, and check reminders once a minute
document.addEventListener("visibilitychange", () => { if (!document.hidden) render(); });
setInterval(checkReminders, 60000);
