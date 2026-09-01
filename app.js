// ---------- Storage helpers ----------
const STORE_KEY = "myreset_state_v1";

function loadState(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){ console.warn("Storage read failed, starting fresh.", e); }
  return null;
}

function saveState(state){
  try{
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  }catch(e){ console.warn("Storage save failed.", e); }
}

function todayStr(){
  const d = new Date();
  return d.toISOString().slice(0,10); // YYYY-MM-DD
}

function isYesterday(dateStr){
  const d = new Date(dateStr + "T00:00:00");
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return d.toDateString() === y.toDateString();
}

function defaultTasks(){
  return [
    { title:"Complete OS chapter", priority:"High", time:"1h", done:false },
    { title:"Practice coding 45 minutes", priority:"Medium", time:"45m", done:false },
    { title:"English speaking 15 minutes", priority:"Low", time:"15m", done:false }
  ];
}

function defaultState(){
  return {
    name:"Arnob",
    lastDate: todayStr(),
    tasks: defaultTasks(),
    streak: 0,
    bestStreak: 0
  };
}

let state = loadState() || defaultState();

// ---------- Daily rollover ----------
function handleDailyRollover(){
  const today = todayStr();
  if(state.lastDate === today) return;

  const allDoneYesterday = state.tasks.length > 0 && state.tasks.every(t => t.done);

  if(allDoneYesterday && isYesterday(state.lastDate)){
    state.streak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
  } else if(!isYesterday(state.lastDate)){
    // more than a day gap, never miss twice softly resets but keeps dignity
    state.streak = 0;
  } else if(!allDoneYesterday){
    state.streak = 0;
  }

  state.tasks = state.tasks.map(t => ({ ...t, done:false }));
  state.lastDate = today;
  saveState(state);
}

handleDailyRollover();

// ---------- Messages ----------
const MESSAGES = [
  "One thing. Finish it.",
  "Start small. Finish strong.",
  "Don't aim for perfect. Aim for done.",
  "Never miss twice.",
  "Keep moving."
];

function pickMessage(){
  const idx = new Date().getDate() % MESSAGES.length;
  return MESSAGES[idx];
}

function greetingWord(){
  const h = new Date().getHours();
  if(h < 12) return "Good morning";
  if(h < 17) return "Good afternoon";
  return "Good evening";
}

// ---------- Rendering ----------
const el = {
  dateLabel: document.getElementById("dateLabel"),
  greeting: document.getElementById("greeting"),
  message: document.getElementById("message"),
  scoreNumber: document.getElementById("scoreNumber"),
  gaugeFill: document.getElementById("gaugeFill"),
  doneCount: document.getElementById("doneCount"),
  remainingCount: document.getElementById("remainingCount"),
  streakCount: document.getElementById("streakCount"),
  taskList: document.getElementById("taskList"),
  editNameBtn: document.getElementById("editNameBtn"),
  toast: document.getElementById("toast"),
  sheetBackdrop: document.getElementById("sheetBackdrop"),
  editSheet: document.getElementById("editSheet"),
  taskTitleInput: document.getElementById("taskTitleInput"),
  taskTimeInput: document.getElementById("taskTimeInput"),
  saveTaskBtn: document.getElementById("saveTaskBtn"),
  sheetTitle: document.getElementById("sheetTitle")
};

let editingIndex = null;
let pendingPriority = "Medium";

function computeScore(){
  const done = state.tasks.filter(t => t.done).length;
  const total = state.tasks.length || 1;
  return Math.round((done/total) * 100);
}

function render(){
  el.dateLabel.textContent = new Date().toLocaleDateString(undefined, { weekday:"long", month:"long", day:"numeric" });
  el.greeting.textContent = `${greetingWord()}, ${state.name}`;
  el.message.textContent = pickMessage();

  const score = computeScore();
  el.scoreNumber.textContent = `${score}%`;
  el.gaugeFill.style.width = `${score}%`;

  const doneCount = state.tasks.filter(t => t.done).length;
  el.doneCount.textContent = doneCount;
  el.remainingCount.textContent = state.tasks.length - doneCount;
  el.streakCount.textContent = state.streak;

  el.taskList.innerHTML = "";
  state.tasks.forEach((task, i) => {
    const li = document.createElement("li");
    li.className = "task-item" + (task.done ? " done" : "");

    const check = document.createElement("button");
    check.className = "check" + (task.done ? " checked" : "");
    check.textContent = "✓";
    check.setAttribute("aria-label", "Toggle task done");
    check.addEventListener("click", () => toggleTask(i));

    const body = document.createElement("div");
    body.className = "task-body";
    body.addEventListener("click", () => openEditSheet(i));

    const title = document.createElement("span");
    title.className = "task-title";
    title.textContent = task.title || "Untitled task";

    const meta = document.createElement("div");
    meta.className = "task-meta";
    const pBadge = document.createElement("span");
    pBadge.className = `badge ${task.priority}`;
    pBadge.textContent = task.priority;
    meta.appendChild(pBadge);
    if(task.time){
      const tBadge = document.createElement("span");
      tBadge.className = "badge";
      tBadge.textContent = task.time;
      meta.appendChild(tBadge);
    }

    body.appendChild(title);
    body.appendChild(meta);
    li.appendChild(check);
    li.appendChild(body);
    el.taskList.appendChild(li);
  });
}

function toggleTask(i){
  state.tasks[i].done = !state.tasks[i].done;
  if(state.tasks[i].done){
    showToast("Nice. One thing finished.");
  }
  saveState(state);
  render();
}

function showToast(msg){
  el.toast.textContent = msg;
  el.toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.toast.classList.remove("show"), 1800);
}

// ---------- Edit sheet ----------
function openEditSheet(i){
  editingIndex = i;
  const task = state.tasks[i];
  el.sheetTitle.textContent = "Edit task";
  el.taskTitleInput.value = task.title;
  el.taskTimeInput.value = task.time || "";
  pendingPriority = task.priority || "Medium";
  updatePriorityChips();
  el.sheetBackdrop.classList.add("open");
  el.editSheet.classList.add("open");
}

function closeSheet(){
  el.sheetBackdrop.classList.remove("open");
  el.editSheet.classList.remove("open");
  editingIndex = null;
}

function updatePriorityChips(){
  document.querySelectorAll(".chip").forEach(chip => {
    chip.classList.toggle("active", chip.dataset.priority === pendingPriority);
  });
}

document.querySelectorAll(".chip").forEach(chip => {
  chip.addEventListener("click", () => {
    pendingPriority = chip.dataset.priority;
    updatePriorityChips();
  });
});

el.saveTaskBtn.addEventListener("click", () => {
  if(editingIndex === null) return;
  const title = el.taskTitleInput.value.trim();
  if(!title){
    showToast("Give the task a name.");
    return;
  }
  state.tasks[editingIndex].title = title;
  state.tasks[editingIndex].time = el.taskTimeInput.value.trim();
  state.tasks[editingIndex].priority = pendingPriority;
  saveState(state);
  render();
  closeSheet();
});

el.sheetBackdrop.addEventListener("click", closeSheet);

el.editNameBtn.addEventListener("click", () => {
  const newName = prompt("What should I call you?", state.name);
  if(newName && newName.trim()){
    state.name = newName.trim();
    saveState(state);
    render();
  }
});

// ---------- Init ----------
render();

// ---------- Service worker ----------
if("serviceWorker" in navigator){
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(err => {
      console.warn("Service worker registration failed:", err);
    });
  });
}
