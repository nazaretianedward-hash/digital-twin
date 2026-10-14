/* Цифровой двойник компании — логика страницы */
const IMAGES = {
  bg: "assets/img/bg.2e6c6f4a54.webp",
  map: "assets/img/map.3b011f9f1c.webp",
  left: "assets/img/objects-left.497ef43a28.webp",
  leftGlow: "assets/img/objects-left-glow.f693200281.webp",
  right: "assets/img/objects-right.763e7952e3.webp",
  rightGlow: "assets/img/objects-right-glow.d0df6962df.webp",
  aura: "assets/img/aura.0b69224203.webp",
  o1l: "assets/img/o1l.a7c7555732.webp",
  alchemist: "assets/img/alchemist.2e79b88996.webp",
  gpnai: "assets/img/gpnai.727fe116ef.webp",
};
const $ = (s) => document.querySelector(s);
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- картинки сцены ---------- */
$("#bgImg").src = IMAGES.bg;
$("#mapImg").src = IMAGES.map;
for (const part of ["left", "right"]) {
  const box = document.querySelector(`.obj-${part}`);
  box.querySelector(".base").src = IMAGES[part];
  box.querySelector(".glow").src = IMAGES[part + "Glow"];
}

/* ---------- ссылки ---------- */
let overrides = store.get("gpn-demo-links") || {};
let newTab = store.get("gpn-demo-newtab");
if (newTab === null) newTab = OPEN_IN_NEW_TAB_DEFAULT;
const urlOf = (p) => (p.id in overrides ? overrides[p.id] : p.url) || "";
const byId = (id) => PRODUCTS.find((p) => p.id === id);

const ARROW = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12L12 4M5.5 4H12v6.5"/></svg>';
const PLAY = '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M5 3.2v9.6c0 .4.4.6.7.4l7.4-4.8a.5.5 0 000-.8L5.7 2.8c-.3-.2-.7 0-.7.4z"/></svg>';

function render() {
  $("#grid").innerHTML = PRODUCTS.map((p, i) => {
    const url = urlOf(p);
    const attrs = p.video
      ? `href="${url || "#"}" data-video="1"`
      : url
        ? `href="${url}" ${newTab ? 'target="_blank" rel="noopener"' : ""}`
        : 'href="#" data-nolink="1"';
    const hl = p.highlight ? ` data-hl="${p.highlight}"` : "";
    return `<a class="card ${p.theme}" ${attrs}${hl} data-id="${p.id}" style="--i:${i}">
      <img class="pic" src="${IMAGES[p.id] || ""}" alt="" style="object-position:${p.pos}">
      <span class="go" aria-hidden="true">${p.video ? PLAY : ARROW}</span>
      <h3>${p.title}</h3>
      <p>${p.full}</p>
    </a>`;
  }).join("");
  $("#sub").textContent = newTab
    ? "Выберите продукт — он откроется в новой вкладке"
    : "Выберите продукт, чтобы открыть демо";
}

let toastT;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove("show"), 3600);
}
const noLinkMsg = (p) => `Ссылка для «${p.title}» пока не задана — нажмите L, чтобы добавить.`;

/* Переход к продукту. Возвращает true, если удалось открыть.
   Без клика пользователя (например, после окончания видео) браузер может не дать открыть вкладку —
   тогда открываем в этой же; если страница встроена в чужое окно, вернём false, и покажем кнопку. */
function goTo(p) {
  const url = urlOf(p);
  if (!url) { toast(noLinkMsg(p)); return false; }
  if (newTab) {
    const w = window.open(url, "_blank");
    if (w) { try { w.opener = null; } catch {} return true; }
  }
  if (window.top !== window) return false;
  location.href = url;
  return true;
}

function openProduct(p) {
  if (p.video) return playVideo(p);
  if (!goTo(p) && urlOf(p)) toast(`Нажмите на карточку «${p.title}», чтобы открыть продукт.`);
}

document.addEventListener("click", (e) => {
  const card = e.target.closest(".card");
  if (!card) return;
  const p = byId(card.dataset.id);
  if (card.dataset.video) { e.preventDefault(); playVideo(p); return; }
  if (card.dataset.nolink) { e.preventDefault(); toast(noLinkMsg(p)); }
});

/* ---------- подсветка частей схемы ---------- */
const scene = $("#scene");
function setLit(part) {
  scene.classList.toggle("has-lit", !!part);
  scene.querySelectorAll(".obj").forEach((o) => o.classList.toggle("lit", o.dataset.part === part));
}
const grid = $("#grid");
grid.addEventListener("pointerover", (e) => {
  const c = e.target.closest(".card");
  if (c) setLit(c.dataset.hl || null);
});
grid.addEventListener("pointerleave", () => setLit(null));
grid.addEventListener("focusin", (e) => {
  const c = e.target.closest(".card");
  if (c) setLit(c.dataset.hl || null);
});
grid.addEventListener("focusout", () => setLit(null));

/* ---------- видео ---------- */
const player = $("#player");
const video = $("#playerVideo");
const bar = $("#playerProgress");
let current = null, idleT = null;

function playVideo(p) {
  current = p;
  setLit(null);
  $("#playerTitle").textContent = p.title;
  const url = urlOf(p) || "#";
  for (const a of [$("#playerSkip"), $("#playerEndLink")]) {
    a.href = url;
    a.target = newTab ? "_blank" : "_top";
  }
  $("#playerEndText").textContent = `Перейти к продукту «${p.title}»`;
  player.classList.remove("ended");
  bar.style.width = "0";
  video.src = p.video;
  player.hidden = false;
  requestAnimationFrame(() => player.classList.add("show"));
  wake();
  const pr = video.play();
  if (pr && pr.catch) pr.catch(() => { video.muted = true; video.play().catch(() => {}); });
}

function closeVideo() {
  if (player.hidden) return;
  video.pause();
  player.classList.remove("show");
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  setTimeout(() => {
    player.hidden = true;
    video.removeAttribute("src");
    video.load();
    video.muted = false;
  }, 450);
  clearTimeout(idleT);
  current = null;
}

/* видео закончилось: открываем продукт, а если браузер не дал — показываем крупную кнопку перехода */
function finish() {
  const p = current;
  if (!p) return;
  if (!urlOf(p)) { closeVideo(); toast(noLinkMsg(p)); return; }
  if (goTo(p)) closeVideo();
  else { player.classList.add("ended"); clearTimeout(idleT); player.classList.remove("idle"); }
}

/* «Пропустить» и кнопка в конце — настоящие ссылки: переход по клику браузер не блокирует */
function onLinkClick(e) {
  const p = current;
  if (!p) return;
  if (!urlOf(p)) { e.preventDefault(); closeVideo(); toast(noLinkMsg(p)); return; }
  setTimeout(closeVideo, 0);
}

video.addEventListener("ended", finish);
video.addEventListener("timeupdate", () => {
  if (video.duration) bar.style.width = (video.currentTime / video.duration) * 100 + "%";
});
video.addEventListener("error", () => {
  if (!current) return;
  toast("Не удалось загрузить видео — проверьте файл " + current.video);
  const p = current;
  closeVideo();
  if (urlOf(p)) goTo(p);
});
video.addEventListener("click", () => (video.paused ? video.play() : video.pause()));
$("#playerSkip").addEventListener("click", onLinkClick);
$("#playerEndLink").addEventListener("click", onLinkClick);
$("#playerClose").addEventListener("click", closeVideo);

function wake() {
  player.classList.remove("idle");
  clearTimeout(idleT);
  idleT = setTimeout(() => !video.paused && !player.classList.contains("ended") && player.classList.add("idle"), 2600);
}
player.addEventListener("pointermove", wake);
video.addEventListener("pause", wake);

/* ---------- лёгкий параллакс фона ---------- */
(function () {
  if (reduceMotion || matchMedia("(pointer:coarse)").matches) return;
  const el = $("#bgImg");
  let tx = 0, ty = 0, x = 0, y = 0, raf = null;
  addEventListener("pointermove", (e) => {
    tx = (e.clientX / innerWidth - 0.5) * -18;
    ty = (e.clientY / innerHeight - 0.5) * -12;
    if (!raf) raf = requestAnimationFrame(step);
  }, { passive: true });
  function step() {
    x += (tx - x) * 0.06; y += (ty - y) * 0.06;
    el.style.setProperty("--px", x.toFixed(2) + "px");
    el.style.setProperty("--py", y.toFixed(2) + "px");
    raf = Math.abs(tx - x) > 0.05 || Math.abs(ty - y) > 0.05 ? requestAnimationFrame(step) : null;
  }
})();

/* ---------- клавиши и окно ссылок ---------- */
const dlg = $("#settings");
document.addEventListener("keydown", (e) => {
  if (!player.hidden) {
    wake();
    if (e.key === "Escape") { e.preventDefault(); closeVideo(); }
    else if (e.key === " " || e.key === "k") { e.preventDefault(); video.paused ? video.play() : video.pause(); }
    else if (e.key === "Enter") { e.preventDefault(); $("#playerSkip").click(); }
    else if (e.key === "f" || e.key === "а") { player.requestFullscreen && !document.fullscreenElement ? player.requestFullscreen().catch(() => {}) : document.exitFullscreen && document.exitFullscreen().catch(() => {}); }
    return;
  }
  if (e.target.closest("input,textarea,dialog") || e.metaKey || e.ctrlKey || e.altKey) return;
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= PRODUCTS.length) openProduct(PRODUCTS[n - 1]);
  else if ("lLдД".includes(e.key)) { fillSettings(); dlg.showModal(); }
});

function fillSettings() {
  $("#settingsBody").innerHTML = PRODUCTS.map((p, i) =>
    `<div class="field"><label for="u-${p.id}"><span>0${i + 1} · ${p.title}</span><small>Ответственный: ${p.owner}</small></label>
     <input id="u-${p.id}" data-id="${p.id}" type="url" inputmode="url" placeholder="https://…" value="${urlOf(p)}"></div>`
  ).join("") +
  `<label class="check"><input type="checkbox" id="newTab" ${newTab ? "checked" : ""}> Открывать продукты в новой вкладке</label>`;
}

$("#settingsForm").addEventListener("submit", (e) => {
  if (e.submitter && e.submitter.value === "save") {
    const next = {};
    document.querySelectorAll("#settingsBody input[data-id]").forEach((inp) => {
      let v = inp.value.trim();
      if (v && !/^[a-z]+:\/\//i.test(v)) v = "https://" + v;
      next[inp.dataset.id] = v;
    });
    overrides = next;
    newTab = $("#newTab").checked;
    store.set("gpn-demo-links", next);
    store.set("gpn-demo-newtab", newTab);
    render();
    document.querySelectorAll(".card").forEach((c) => (c.style.transitionDelay = "0s"));
    toast("Ссылки сохранены");
  }
});
$("#resetLinks").onclick = () => {
  overrides = {};
  newTab = OPEN_IN_NEW_TAB_DEFAULT;
  store.del("gpn-demo-links");
  store.del("gpn-demo-newtab");
  fillSettings();
  render();
  toast("Исходные ссылки восстановлены");
};

render();

/* плавное появление после загрузки шрифтов и картинок */
const imgs = [...document.images];
Promise.all([
  document.fonts ? document.fonts.ready : Promise.resolve(),
  ...imgs.map((i) => (i.decode ? i.decode().catch(() => {}) : Promise.resolve())),
]).then(() => requestAnimationFrame(() => document.body.classList.add("ready")));
