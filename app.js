/* ═══ 翻牌屏 · 时刻车间 —— 逻辑层 ═══ */
"use strict";

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

window.addEventListener("error", (e) => { $("#errSink").textContent += "ERR:" + e.message + ";"; });
const say = (m) => { $("#stMsg").textContent = m; };

/* ═══ 翻牌核心：值变才翻 ═══ */
function setCard(card, val) {
  if (card.dataset.v === val) return;
  card.dataset.v = val;
  card.classList.remove("flip");
  void card.offsetWidth;
  card.classList.add("flip");
  setTimeout(() => { card.querySelector("i").textContent = val; }, 110);
}
function setClock(container, str) {
  const cards = container.querySelectorAll(".card");
  const digits = str.replace(/\D/g, "");
  digits.split("").forEach((d, i) => { if (cards[i]) setCard(cards[i], d); });
}

/* ═══ 大翻牌时钟 + 状态轨日期 ═══ */
const WEEK = ["日", "一", "二", "三", "四", "五", "六"];
function tick() {
  const n = new Date();
  const p = (x) => String(x).padStart(2, "0");
  setClock($("#bigClock"), p(n.getHours()) + ":" + p(n.getMinutes()) + ":" + p(n.getSeconds()));
  $("#stDate").textContent = n.getFullYear() + " 年 " + (n.getMonth() + 1) + " 月 " + n.getDate() + " 日 · 星期" + WEEK[n.getDay()];
}
tick(); setInterval(tick, 1000);

/* ═══ 工具切换 ═══ */
$("#switcher").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  $$("#switcher button").forEach((x) => x.classList.toggle("on", x === b));
  $$(".view").forEach((v) => (v.hidden = v.id !== "v-" + b.dataset.t));
});

/* ═══ 01 番茄钟 ═══ */
const pomo = { phase: "work", running: false, endAt: 0, left: 25 * 60, done: 0 };
const POMO_LS = "solari_pomo_v1";
try { pomo.done = +(localStorage.getItem(POMO_LS) || 0) || 0; } catch {}

function pomoRender() {
  const t = Math.max(0, Math.ceil(pomo.left));
  setClock($("#pomoClock"), String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0"));
  const ph = $("#pomoPhase");
  ph.textContent = pomo.phase === "work" ? "专注时段" : "小憩时段";
  ph.classList.toggle("rest", pomo.phase === "rest");
  document.title = (pomo.running ? (pomo.phase === "work" ? "🍅" : "☕") + Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0") + " · " : "") + "翻牌屏 · 时刻车间";
}
function pomoTick() {
  if (!pomo.running) return;
  pomo.left = (pomo.endAt - Date.now()) / 1000;
  if (pomo.left <= 0) {
    if (pomo.phase === "work") {
      pomo.done++; try { localStorage.setItem(POMO_LS, pomo.done); } catch {}
      pomo.phase = "rest"; pomo.left = +$("#poR").value * 60;
    } else {
      pomo.phase = "work"; pomo.left = +$("#poW").value * 60;
    }
    pomo.endAt = Date.now() + pomo.left * 1000;
    say(pomo.phase === "work" ? "小憩结束 —— 回到专注时段" : "专注完成！已累计 " + pomo.done + " 轮");
  }
  $("#poInfo").textContent = "状态：" + (pomo.running ? "运转中" : "停机") +
    "　·　累计完成 " + pomo.done + " 轮　·　当前段 " + (pomo.phase === "work" ? "专注" : "小憩");
  pomoRender();
}
setInterval(pomoTick, 250);

$("#poStart").addEventListener("click", () => {
  if (pomo.running) return;
  if (pomo.left <= 0) pomo.left = (pomo.phase === "work" ? +$("#poW").value : +$("#poR").value) * 60;
  pomo.endAt = Date.now() + pomo.left * 1000;
  pomo.running = true;
  say("翻牌运转 —— " + (pomo.phase === "work" ? "专注" : "小憩") + " " + Math.round(pomo.left / 60) + " 分钟");
});
$("#poPause").addEventListener("click", () => {
  pomo.running = false;
  pomo.left = Math.max(0, (pomo.endAt - Date.now()) / 1000);
  say("已暂停，剩 " + Math.ceil(pomo.left / 60) + " 分钟");
});
$("#poReset").addEventListener("click", () => {
  pomo.running = false;
  pomo.phase = "work";
  pomo.left = +$("#poW").value * 60;
  say("已复位到专注 " + $("#poW").value + " 分钟");
  pomoRender();
});
$("#poSkip").addEventListener("click", () => {
  pomo.phase = pomo.phase === "work" ? "rest" : "work";
  pomo.left = (pomo.phase === "work" ? +$("#poW").value : +$("#poR").value) * 60;
  pomo.endAt = Date.now() + pomo.left * 1000;
  say("跳到" + (pomo.phase === "work" ? "专注" : "小憩") + "时段");
});
pomo.left = +$("#poW").value * 60;
pomoRender();
$("#poInfo").textContent = "状态：停机　·　累计完成 " + pomo.done + " 轮　·　当前段 专注";

/* ═══ 02 倒数日 ═══ */
const CD_LS = "solari_countdown_v1";
let cds = [];
try { cds = JSON.parse(localStorage.getItem(CD_LS) || "[]"); } catch {}
const saveCds = () => { try { localStorage.setItem(CD_LS, JSON.stringify(cds)); } catch {} };

function renderCds() {
  const ul = $("#cdList");
  ul.innerHTML = "";
  if (!cds.length) {
    ul.innerHTML = "<li class='cd-item' style='grid-column:1/-1'><p class='mono'>还没有挂牌事项。输入名称与日期，按「挂牌」。</p></li>";
    return;
  }
  const today = new Date(); today.setHours(0, 0, 0, 0);
  cds.forEach((cd, i) => {
    const d = new Date(cd.date + "T00:00:00");
    const days = Math.round((d - today) / 864e5);
    const li = document.createElement("li");
    li.className = "cd-item" + (days < 0 ? " past" : "");
    const abs = Math.abs(days);
    const num = String(abs).padStart(3, "0").split("").map(() => "<span class='card' data-v='0'><i>0</i></span>").join("");
    li.innerHTML =
      "<button class='del' title='摘牌'>✕</button>" +
      "<h3>" + esc(cd.name) + "</h3>" +
      "<div class='days'>" + num + "<em>" + (days >= 0 ? "天后" : "天前（已过）") + "</em></div>" +
      "<p class='when'>" + cd.date + " · 星期" + WEEK[d.getDay()] + "</p>";
    li.querySelectorAll(".days .card").forEach((card, k) => {
      setCard(card, String(abs).padStart(3, "0")[k]);
    });
    li.querySelector(".del").addEventListener("click", () => {
      cds.splice(i, 1); saveCds(); renderCds(); say("已摘牌：" + cd.name);
    });
    ul.appendChild(li);
  });
}
$("#cdAdd").addEventListener("click", () => {
  const name = $("#cdName").value.trim();
  const date = $("#cdDate").value;
  if (!name || !date) { say("事项名与日期都要填"); return; }
  cds.unshift({ name, date });
  saveCds(); renderCds();
  $("#cdName").value = "";
  say("已挂牌：" + name);
});
renderCds();

/* ═══ 03 摇号机 ═══ */
function buildWall(n) {
  const w = $("#loWall");
  w.innerHTML = "";
  for (let i = 0; i < n; i++) {
    const c = document.createElement("span");
    c.className = "card";
    c.innerHTML = "<i>0</i>";
    c.dataset.v = "0";
    w.appendChild(c);
  }
  return w.querySelectorAll(".card");
}
function draw(min, max, n, noDup) {
  const span = max - min + 1;
  if (noDup && n > span) return null;
  const out = [];
  const used = new Set();
  while (out.length < n) {
    const v = min + Math.floor(Math.random() * span);
    if (noDup && used.has(v)) continue;
    used.add(v); out.push(v);
  }
  return out;
}
function roll() {
  const min = +$("#loMin").value || 1;
  const max = +$("#loMax").value || 35;
  const n = Math.min(12, Math.max(1, +$("#loN").value || 1));
  const noDup = $("#loNoDup").checked;
  if (max < min) { say("「止」不能小于「起」"); return; }
  const result = draw(min, max, n, noDup);
  if (!result) { say("范围内数字不够不重复抽取 —— 放宽个数或取消不重复"); return; }
  const cards = buildWall(n);
  $("#loInfo").textContent = "翻牌滚动中……";
  say("摇号机开摇");
  let rounds = 0;
  const digits = String(Math.max(...result.map(Math.abs))).length;
  const timer = setInterval(() => {
    rounds++;
    cards.forEach((c) => {
      c.querySelector("i").textContent = String(min + Math.floor(Math.random() * (max - min + 1))).padStart(digits, "0");
      c.classList.remove("flip"); void c.offsetWidth; c.classList.add("flip");
    });
    if (rounds >= 12) {
      clearInterval(timer);
      setTimeout(() => {
        result.forEach((v, i) => {
          const c = cards[i];
          setTimeout(() => {
            c.querySelector("i").textContent = String(v).padStart(digits, "0");
            c.classList.remove("flip"); void c.offsetWidth; c.classList.add("flip");
            c.classList.add("done");
          }, i * 160);
        });
        setTimeout(() => {
          $("#loInfo").textContent = "落定：" + result.map((v) => String(v).padStart(digits, "0")).join("　") +
            (noDup ? "（互不重复）" : "");
          say("摇号落定 · 共 " + result.length + " 个");
        }, result.length * 160 + 240);
      }, 160);
    }
  }, 130);
}
$("#loGo").addEventListener("click", roll);
$("#loAgain").addEventListener("click", roll);

/* ═══ 04 骰子桌 ═══ */
const PIPS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};
function makeDie(v, red) {
  const d = document.createElement("div");
  d.className = "die" + (red ? " red" : "");
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement("span");
    if (PIPS[v].includes(i)) cell.className = "pip";
    d.appendChild(cell);
  }
  return d;
}
let diLog = [];
$("#diGo").addEventListener("click", () => {
  const n = +$("#diN").value;
  const wall = $("#diWall");
  wall.innerHTML = "";
  for (let i = 0; i < n; i++) wall.appendChild(makeDie(1));
  let rounds = 0;
  const timer = setInterval(() => {
    rounds++;
    Array.from(wall.children).forEach((old) => {
      const d = makeDie(1 + Math.floor(Math.random() * 6));
      d.classList.add("flip");
      old.replaceWith(d);
    });
    if (rounds >= 8) {
      clearInterval(timer);
      const vals = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 6));
      setTimeout(() => {
        wall.innerHTML = "";
        vals.forEach((v, i) => {
          const d = makeDie(v, v === 6 || v === 1);
          d.classList.add("flip");
          wall.appendChild(d);
        });
        const sum = vals.reduce((a, b) => a + b, 0);
        $("#diSum").textContent = "合计 " + sum + (n === 2 ? (sum >= 11 ? "　大" : sum <= 6 ? "　小" : "　中") : "");
        diLog.unshift(vals);
        diLog = diLog.slice(0, 10);
        $("#diLog").innerHTML = diLog.map((l) => "<li>掷出　<b>" + l.join(" + ") + "</b>　= " + l.reduce((a, b) => a + b, 0) + "</li>").join("");
        say("掷骰落定 · 合计 " + sum);
      }, 160);
    }
  }, 140);
});
$("#diClear").addEventListener("click", () => { diLog = []; $("#diLog").innerHTML = ""; $("#diSum").textContent = ""; say("骰子记录已清空"); });

/* ═══ 05 世界钟 ═══ */
const CITIES = [
  { n: "北京", z: "Asia/Shanghai" },
  { n: "东京", z: "Asia/Tokyo" },
  { n: "迪拜", z: "Asia/Dubai" },
  { n: "伦敦", z: "Europe/London" },
  { n: "巴黎", z: "Europe/Paris" },
  { n: "纽约", z: "America/New_York" },
  { n: "洛杉矶", z: "America/Los_Angeles" },
  { n: "悉尼", z: "Australia/Sydney" },
];
const wul = $("#worldList");
CITIES.forEach((c) => {
  const li = document.createElement("li");
  li.innerHTML =
    "<div><span class='city'>" + c.n + "</span><span class='zone'>" + c.z + "</span></div>" +
    "<div class='clock'><span class='card' data-v='0'><i>0</i></span><span class='card' data-v='0'><i>0</i></span>" +
    "<span class='colon'>:</span>" +
    "<span class='card' data-v='0'><i>0</i></span><span class='card' data-v='0'><i>0</i></span></div>";
  wul.appendChild(li);
  c.cards = li.querySelectorAll(".card");
});
function worldTick() {
  CITIES.forEach((c) => {
    const s = new Intl.DateTimeFormat("zh-CN", { timeZone: c.z, hour12: false, hour: "2-digit", minute: "2-digit" }).format(new Date());
    const digits = s.replace(/\D/g, "");
    digits.split("").forEach((d, i) => { if (c.cards[i]) setCard(c.cards[i], d); });
  });
}
worldTick(); setInterval(worldTick, 5000);
