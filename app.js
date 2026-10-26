import { CONFIG, firebaseConfig, SQUADRE, GIOCATORI, CALENDARIO } from "./data.js";

// =====================================================================
//  Utilità
// =====================================================================
const FIREBASE_VERSION = "10.12.2";
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = (n) => String(n).padStart(2, "0");
const oggi = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const toDate = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const fmtLungo = (s) => (s ? toDate(s).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" }) : "Data da definire");
const fmtBreve = (s) => (s ? toDate(s).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" }) : "data da definire");
const ord = (n) => `${n}ª giornata`;

const ICONS = {
  squadra: '<path d="M8 3 3 6l2 4 2-1v12h10V9l2 1 2-4-5-3c0 1.7-1.8 3-4 3S8 4.7 8 3z"/>',
  giocatori: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3c2.1.7 3.5 2.8 3.5 5.7"/>',
  calendario: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  classifica: '<path d="M3 21h18M6 21V11M12 21V5M18 21v-7"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  unlock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>',
  pin: '<path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.8 7L4 20l1.1-4.6A8 8 0 1 1 21 12z"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="m13.5 6.5 4 4"/>',
  left: '<path d="m15 6-6 6 6 6"/>',
  right: '<path d="m9 6 6 6-6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
};
const ic = (name, cls = "") => `<svg viewBox="0 0 24 24" class="ic ${cls}" aria-hidden="true">${ICONS[name]}</svg>`;

// =====================================================================
//  Dati statici
// =====================================================================
const TEAM = Object.fromEntries(SQUADRE.map((t) => [t.id, t]));
// Giocatori: si parte da data.js; se in Firestore esiste un elenco salvato dal sito, vince quello.
// { id, nome, attivo } — attivo:false = non più in squadra (resta nelle statistiche, sparisce dai menu)
let ROSA = [], PLAYER = {}, ROSA_ATTIVI = [];
function setRosa(list) {
  ROSA = list.map((p) => ({ id: p.id, nome: p.nome, attivo: p.attivo !== false }));
  PLAYER = Object.fromEntries(ROSA.map((p) => [p.id, p]));
  ROSA_ATTIVI = ROSA.filter((p) => p.attivo).sort((a, b) => a.nome.localeCompare(b.nome, "it"));
}
setRosa(GIOCATORI);
const MIA = CONFIG.miaSquadra;
const F = CONFIG.formato;
const N_SET = F.turni * F.setPerTurno;              // set totali in un incontro
const TOT_PUNTI = N_SET * F.partitePerSet;          // partite (= punti) in palio
const setLabel = (s) => `T${Math.floor(s / F.setPerTurno) + 1} · Set ${(s % F.setPerTurno) + 1}`;

const MATCHES = CALENDARIO.flatMap((g) =>
  g.partite.map((p) => ({
    id: `g${g.giornata}-${p.casa}-${p.ospite}`,
    giornata: g.giornata,
    casa: p.casa,
    ospite: p.ospite,
    data: p.data || g.data || "",
    ora: p.ora || g.ora || "",
  }))
);
const GIORNATE = CALENDARIO.map((g) => g.giornata);
const isMia = (m) => m.casa === MIA || m.ospite === MIA;

// =====================================================================
//  Stato
// =====================================================================
const VIEWS = ["squadra", "giocatori", "calendario", "classifica"];
const state = {
  view: "squadra",
  team: null,
  giornata: null,
  filtroMia: "tutte",
  expanded: new Set(),
  risultati: {}, // da Firestore
  demo: {},      // generati localmente se CONFIG.demo
  user: null,
  fb: null,
  fbStatus: "loading",
};

// Unisce calendario + eventuale risultato (reale > demo)
function info(m) {
  const real = state.risultati[m.id];
  const r = real || state.demo[m.id] || null;
  const played = !!r && (Number(r.vintiCasa) || 0) + (Number(r.vintiOspite) || 0) > 0;
  return { ...m, data: r?.data || m.data, ora: r?.ora || m.ora, r, played, demo: !real && !!state.demo[m.id] };
}

// =====================================================================
//  Calcoli: classifica e statistiche giocatori
// =====================================================================
// Punti = partite vinte (1 punto ciascuna)
function classifica() {
  const rows = Object.fromEntries(SQUADRE.map((t) => [t.id, { id: t.id, pt: 0, g: 0, pd: 0, pp: 0 }]));
  MATCHES.map(info).filter((m) => m.played).forEach((m) => {
    const a = rows[m.casa], b = rows[m.ospite];
    if (!a || !b) return;
    const x = Number(m.r.vintiCasa) || 0, y = Number(m.r.vintiOspite) || 0;
    a.g++; b.g++;
    a.pt += x; a.pp += y; a.pd += x + y;
    b.pt += y; b.pp += x; b.pd += x + y;
  });
  return Object.values(rows).sort((a, b) =>
    b.pt - a.pt || a.g - b.g || TEAM[a.id].nome.localeCompare(TEAM[b.id].nome, "it")
  );
}

// Ogni set: { giocatori: [id, id], esiti: ["V"|"P"|null, ...] }
function statsGiocatori() {
  const s = Object.fromEntries(ROSA.map((p) => [p.id, { id: p.id, nome: p.nome, attivo: p.attivo, gp: 0, pd: 0, v: 0, p: 0 }]));
  MATCHES.filter(isMia).map(info).filter((m) => m.played && Array.isArray(m.r.set)).forEach((m) => {
    const presenti = new Set();
    m.r.set.forEach((st) => {
      if (!st) return;
      const esiti = (st.esiti || []).filter(Boolean);
      if (!esiti.length) return;
      (st.giocatori || []).forEach((id) => {
        const g = s[id];
        if (!g) return;
        presenti.add(id);
        esiti.forEach((e) => { g.pd++; if (e === "V") g.v++; else g.p++; });
      });
    });
    presenti.forEach((id) => s[id].gp++);
  });
  // gli ex giocatori compaiono solo se hanno giocato almeno una partita
  return Object.values(s).filter((g) => g.attivo || g.pd > 0)
    .sort((a, b) => b.pd - a.pd || a.nome.localeCompare(b.nome, "it"));
}

function giornataCorrente() {
  const t = oggi();
  const g = GIORNATE.find((n) => MATCHES.some((m) => m.giornata === n && (() => { const i = info(m); return !i.played && (i.data || "9999") >= t; })()));
  return g ?? GIORNATE[GIORNATE.length - 1];
}

// =====================================================================
//  Dati di esempio (solo visualizzazione, non vengono salvati)
// =====================================================================
function generaDemo() {
  if (!CONFIG.demo) return {};
  let seed = 20262027;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const out = {};
  const t = oggi();
  MATCHES.filter((m) => m.data && m.data < t).forEach((m) => {
    if (isMia(m)) {
      const presenti = shuffle(GIOCATORI.map((p) => p.id)).slice(0, 6 + Math.floor(rnd() * 5));
      const avv = shuffle(["Rossi", "Bianchi", "Verdi", "Russo", "Ferrari", "Esposito", "Romano", "Colombo"]).slice(0, 6);
      const set = Array.from({ length: N_SET }, () => ({
        giocatori: shuffle(presenti).slice(0, F.giocatoriPerSet),
        avversari: shuffle(avv).slice(0, F.giocatoriPerSet),
        esiti: Array.from({ length: F.partitePerSet }, () => (rnd() < 0.52 ? "V" : "P")),
      }));
      const v = set.flatMap((s) => s.esiti).filter((e) => e === "V").length, p = TOT_PUNTI - v;
      out[m.id] = m.casa === MIA ? { vintiCasa: v, vintiOspite: p, set } : { vintiCasa: p, vintiOspite: v, set };
    } else {
      const x = 3 + Math.floor(rnd() * (TOT_PUNTI - 5));
      out[m.id] = { vintiCasa: x, vintiOspite: TOT_PUNTI - x };
    }
  });
  return out;
}

// =====================================================================
//  Componenti
// =====================================================================
const mapsUrl = (sede) => sede?.maps || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${sede?.nome || ""}, ${sede?.indirizzo || ""}`)}`;
const telUrl = (n) => `tel:${String(n).replace(/[^\d+]/g, "")}`;
const waUrl = (n) => { let d = String(n).replace(/\D/g, ""); if (d.length === 10) d = "39" + d; return `https://wa.me/${d}`; };

function badge(id, cls = "") {
  const t = TEAM[id];
  if (!t) return "";
  if (t.logo) return `<span class="badge ${cls}"><img src="${esc(t.logo)}" alt=""></span>`;
  return `<span class="badge ${cls}" style="--c:${esc(t.colore || "#888")}">${esc(t.sigla || t.nome.slice(0, 2))}</span>`;
}
const tname = (id) => `<button class="tname ${id === MIA ? "mine" : ""}" data-team="${esc(id)}">${esc(TEAM[id]?.nome || id)}</button>`;

function matchRow(m, { meta = "", edit = true } = {}) {
  const x = m.r?.vintiCasa, y = m.r?.vintiOspite;
  const mid = m.played
    ? `<div class="m-score"><span class="${x >= y ? "w" : "l"}">${x}</span><i>-</i><span class="${y >= x ? "w" : "l"}">${y}</span></div>`
    : `<div class="m-time">${esc(m.ora || "--:--")}</div>`;
  return `
    <div class="match">
      <div class="m-side home">${tname(m.casa)}${badge(m.casa)}</div>
      <div class="m-mid">
        ${meta ? `<div class="m-meta">${meta}</div>` : ""}
        ${mid}
        ${m.demo ? `<div class="m-tag">esempio</div>` : ""}
        ${edit && state.user ? `<button class="m-edit" data-edit="${m.id}">${ic("edit", "sm")} ${m.played ? "Modifica" : "Risultato"}</button>` : ""}
      </div>
      <div class="m-side away">${badge(m.ospite)}${tname(m.ospite)}</div>
    </div>`;
}

const puntiMia = (m) => (m.casa === MIA ? m.r.vintiCasa : m.r.vintiOspite);
const hasFormazione = (m) => Array.isArray(m.r?.set) && m.r.set.some((s) => s && (s.esiti || []).some(Boolean));

function formazione(m) {
  let html = "";
  for (let t = 0; t < F.turni; t++) {
    const rows = [];
    for (let k = 0; k < F.setPerTurno; k++) {
      const s = t * F.setPerTurno + k;
      const st = m.r.set?.[s];
      if (!st || !(st.esiti || []).some(Boolean)) continue;
      const nomi = (st.giocatori || []).map((id) => esc(PLAYER[id]?.nome || "?")).join(" · ");
      const avv = (st.avversari || []).filter(Boolean).map(esc).join(" · ");
      const res = (st.esiti || []).map((e) => `<span class="res r-${e || "X"}">${e || "–"}</span>`).join("");
      rows.push(`<div class="form-row"><span class="form-n">Set ${k + 1}</span><span class="form-p">${nomi}${avv ? `<small>vs ${avv}</small>` : ""}</span><span class="res-group">${res}</span></div>`);
    }
    if (rows.length) html += `<div class="form-turno">Turno ${t + 1}</div>${rows.join("")}`;
  }
  return `<div class="form">${html}</div>`;
}

function mcard(m) {
  let pill = "";
  if (m.played) {
    const pt = puntiMia(m);
    const cls = pt > TOT_PUNTI / 2 ? "V" : pt < TOT_PUNTI / 2 ? "P" : "N";
    pill = `<span class="pill p-${cls}">${pt} punt${pt === 1 ? "o" : "i"}</span>`;
  }
  const quando = `${ord(m.giornata)} · ${fmtBreve(m.data)}${!m.played && m.ora ? " · " + esc(m.ora) : ""}`;
  let foot;
  if (m.played) {
    if (hasFormazione(m)) {
      const open = state.expanded.has(m.id);
      foot = `<button class="mcard-foot mcard-toggle" data-expand="${m.id}">Formazione e set ${ic("down", open ? "rot" : "")}</button>${open ? formazione(m) : ""}`;
    } else {
      foot = `<div class="mcard-foot muted">Formazione non inserita</div>`;
    }
  } else {
    const sede = TEAM[m.casa]?.sede;
    foot = sede
      ? `<a class="mcard-foot link" href="${mapsUrl(sede)}" target="_blank" rel="noopener">${ic("pin")} <span>${esc(sede.nome)}</span> <span class="addr">· ${esc(sede.indirizzo)}</span></a>`
      : "";
  }
  return `
    <div class="card mcard">
      <div class="mcard-head"><span class="grow">${quando}</span>${pill}</div>
      ${matchRow(m)}
      ${foot}
    </div>`;
}

// =====================================================================
//  Viste
// =====================================================================
function viewSquadra() {
  const t = TEAM[MIA];
  const ms = MATCHES.filter(isMia).map(info);
  const cl = classifica();
  const pos = cl.findIndex((r) => r.id === MIA) + 1;
  const row = cl[pos - 1];
  const next = ms.find((m) => !m.played && (m.data || "9999") >= oggi()) || ms.find((m) => !m.played);
  const f = state.filtroMia;
  const list = ms.filter((m) => f === "tutte" || (f === "giocate" ? m.played : !m.played));

  const nextHtml = next
    ? `<div class="next">${ic("clock")}<div><span class="muted">Prossima partita</span><b>${next.casa === MIA ? "vs " : "@ "}${esc(TEAM[next.casa === MIA ? next.ospite : next.casa].nome)}</b><span style="text-transform:capitalize">${fmtLungo(next.data)}${next.ora ? " · " + esc(next.ora) : ""}</span></div></div>`
    : "";

  const chips = [["tutte", "Tutte"], ["dagiocare", "Da giocare"], ["giocate", "Giocate"]]
    .map(([k, l]) => `<button class="chip ${f === k ? "active" : ""}" data-filtro="${k}">${l}</button>`).join("");

  return `
    <div class="card hero">
      <div class="hero-top">
        ${badge(MIA, "lg")}
        <div>
          <div class="hero-name">${esc(t.nome)}</div>
          <div class="hero-sub">${row.g ? `${pos}° posto in classifica` : "Campionato non ancora iniziato"}</div>
        </div>
      </div>
      <div class="hero-stats">
        <div class="stat"><b>${row.g ? pos + "°" : "–"}</b><span>Posizione</span></div>
        <div class="stat"><b>${row.pt}</b><span>Punti</span></div>
        <div class="stat"><b>${row.g}</b><span>Giocate</span></div>
        <div class="stat"><b>${row.g ? (row.pt / row.g).toFixed(1).replace(".", ",") : "–"}</b><span>Media</span></div>
      </div>
      ${nextHtml}
    </div>
    <div class="chips">${chips}</div>
    ${list.length ? list.map(mcard).join("") : `<div class="card empty">Nessuna partita in questo elenco.</div>`}
  `;
}

function viewGiocatori() {
  const s = statsGiocatori();
  const rows = s.map((g, i) => {
    const pct = g.pd ? Math.round((g.v / g.pd) * 100) : null;
    return `<tr>
      <td class="pos">${i + 1}</td>
      <td class="l pname">${esc(g.nome)}${g.attivo ? "" : ` <span class="ex">ex</span>`}</td>
      <td>${g.gp}</td>
      <td class="strong">${g.pd}</td>
      <td>${g.v}</td>
      <td>${g.p}</td>
      <td><div class="pct"><span>${pct === null ? "–" : pct + "%"}</span><span class="pct-bar"><i style="width:${pct || 0}%"></i></span></div></td>
    </tr>`;
  }).join("");
  return `
    ${state.user ? `<button class="btn-admin-wide" data-action="rosa">${ic("edit")} Aggiungi o modifica giocatori</button>` : ""}
    <div class="sec-label">Statistiche giocatori · ${esc(TEAM[MIA].nome)}</div>
    <div class="card">
      <table class="tbl">
        <thead><tr><th></th><th class="l">Giocatore</th><th>GP</th><th>PD</th><th>V</th><th>P</th><th>%V</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="legend"><b>GP</b> giornate di presenza · <b>PD</b> partite disputate · <b>V</b> vinte · <b>P</b> perse · <b>%V</b> percentuale vittorie.<br>Ordinati per partite disputate, a parità in ordine alfabetico.</div>
  `;
}

function teamChips() {
  return `<div class="chips">
    <button class="chip ${!state.team ? "active" : ""}" data-nav="calendario">Tutte</button>
    ${SQUADRE.map((t) => `<button class="chip ${state.team === t.id ? "active" : ""}" data-team="${t.id}">${badge(t.id, "xs")}${esc(t.nome)}</button>`).join("")}
  </div>`;
}

function viewCalendario() {
  if (state.team) return viewTeam(state.team);
  if (state.giornata == null) state.giornata = giornataCorrente();
  const g = state.giornata;
  const idx = GIORNATE.indexOf(g);
  const ms = MATCHES.filter((m) => m.giornata === g).map(info)
    .sort((a, b) => (a.data || "9999").localeCompare(b.data || "9999") || (a.ora || "").localeCompare(b.ora || ""));
  const gruppi = [];
  ms.forEach((m) => {
    const last = gruppi[gruppi.length - 1];
    if (last && last.data === m.data) last.items.push(m); else gruppi.push({ data: m.data, items: [m] });
  });
  return `
    ${teamChips()}
    <div class="gsel">
      <button data-step="-1" ${idx <= 0 ? "disabled" : ""} aria-label="Giornata precedente">${ic("left")}</button>
      <select id="sel-giornata" aria-label="Giornata">${GIORNATE.map((n) => `<option value="${n}" ${n === g ? "selected" : ""}>${ord(n)}</option>`).join("")}</select>
      <button data-step="1" ${idx >= GIORNATE.length - 1 ? "disabled" : ""} aria-label="Giornata successiva">${ic("right")}</button>
    </div>
    ${gruppi.map((gr) => `<div class="sec-label">${fmtLungo(gr.data)}</div><div class="card group">${gr.items.map((m) => matchRow(m)).join("")}</div>`).join("")}
  `;
}

function viewTeam(id) {
  const t = TEAM[id];
  const cl = classifica();
  const pos = cl.findIndex((r) => r.id === id) + 1;
  const row = cl[pos - 1];
  const ms = MATCHES.filter((m) => m.casa === id || m.ospite === id).map(info);
  const referenti = (t.referenti || []).map((r) => `
    <div class="contact">
      <div class="who">${esc(r.nome)}<small>${esc(r.telefono || "")}</small></div>
      ${r.telefono ? `<a class="round" href="${telUrl(r.telefono)}" aria-label="Chiama ${esc(r.nome)}">${ic("phone")}</a>
      <a class="round wa" href="${waUrl(r.telefono)}" target="_blank" rel="noopener" aria-label="WhatsApp ${esc(r.nome)}">${ic("chat")}</a>` : ""}
    </div>`).join("");
  return `
    ${teamChips()}
    <div class="card profile">
      <div class="profile-top">
        ${badge(id, "lg")}
        <div>
          <h2>${esc(t.nome)}</h2>
          <div class="muted">${row.g ? `${pos}° posto · ${row.pt} punti in ${row.g} giornat${row.g === 1 ? "a" : "e"}` : "Nessuna partita giocata"}</div>
        </div>
      </div>
      <div class="p-block">
        <div class="p-label">Referenti</div>
        ${referenti || `<div class="muted">Nessun referente indicato</div>`}
      </div>
      ${t.sede ? `<div class="p-block">
        <div class="p-label">Sede di gioco</div>
        <div><b>${esc(t.sede.nome)}</b></div>
        <div class="muted">${esc(t.sede.indirizzo || "")}</div>
        <a class="btn-maps" href="${mapsUrl(t.sede)}" target="_blank" rel="noopener">${ic("pin")} Apri in Google Maps</a>
      </div>` : ""}
    </div>
    <div class="sec-label">Calendario ${esc(t.nome)}</div>
    <div class="card group">
      ${ms.map((m) => matchRow(m, { meta: `${m.giornata}ª · ${fmtBreve(m.data)}` })).join("")}
    </div>
  `;
}

function viewClassifica() {
  const cl = classifica();
  const rows = cl.map((r, i) => `<tr class="${r.id === MIA ? "mine" : ""}">
      <td class="pos" style="--bar:${i === 0 && r.g ? "var(--amber)" : "transparent"}">${i + 1}</td>
      <td class="l team"><div class="tcell">${badge(r.id, "xs")}${tname(r.id)}</div></td>
      <td class="strong">${r.pt}</td>
      <td>${r.g}</td><td>${r.pd}</td><td>${r.pp}</td>
    </tr>`).join("");
  return `
    <div class="sec-label">Classifica generale</div>
    <div class="card">
      <table class="tbl">
        <thead><tr><th></th><th class="l">Squadra</th><th>PT</th><th>G</th><th>PD</th><th>P</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="legend"><b>PT</b> punti totalizzati (1 per ogni partita vinta, ${TOT_PUNTI} in palio a giornata) · <b>G</b> giornate disputate · <b>PD</b> partite disputate · <b>P</b> partite perse.</div>
  `;
}

// =====================================================================
//  Render
// =====================================================================
const TAB_LABEL = { squadra: TEAM[MIA]?.nome || "Squadra", giocatori: "Giocatori", calendario: "Calendario", classifica: "Classifica" };

function renderTabs() {
  $("#tabs").innerHTML = VIEWS.map((v) =>
    `<button class="tab ${state.view === v ? "active" : ""}" data-nav="${v}" aria-label="${TAB_LABEL[v]}">${ic(v)}<span>${esc(TAB_LABEL[v])}</span></button>`
  ).join("");
}

function renderBanner() {
  const parts = [];
  if (state.user) parts.push(`<div class="banner admin">${ic("unlock")}<span class="grow">Modalità inserimento attiva: usa il pulsante «Risultato» sulle partite.</span><button data-action="logout">Esci</button></div>`);
  if (Object.keys(state.demo).length) parts.push(`<div class="banner demo"><span class="grow">Stai vedendo <b>risultati di esempio</b>. Per nasconderli imposta <code>demo: false</code> in data.js.</span></div>`);
  if (state.fbStatus === "offline") parts.push(`<div class="banner warn"><span class="grow">Risultati online non raggiungibili al momento.</span></div>`);
  if (state.fbStatus === "error") parts.push(`<div class="banner warn"><span class="grow">Errore nel caricamento dei risultati (controlla le regole di Firestore).</span></div>`);
  $("#banner").innerHTML = parts.join("");
}

function render() {
  renderTabs();
  renderBanner();
  const btn = $("#btn-admin");
  btn.classList.toggle("on", !!state.user);
  btn.innerHTML = ic(state.user ? "unlock" : "lock");
  const views = { squadra: viewSquadra, giocatori: viewGiocatori, calendario: viewCalendario, classifica: viewClassifica };
  $("#app").innerHTML = views[state.view]();
}

function route() {
  const [v, t] = decodeURIComponent(location.hash.slice(1)).split("/");
  const prev = state.view + "/" + state.team;
  state.view = VIEWS.includes(v) ? v : "squadra";
  state.team = state.view === "calendario" && TEAM[t] ? t : null;
  render();
  if (prev !== state.view + "/" + state.team) window.scrollTo(0, 0);
}

// =====================================================================
//  Modale, toast
// =====================================================================
function openModal(html) {
  $("#modal-root").innerHTML = `<div class="overlay" data-overlay><div class="sheet" role="dialog" aria-modal="true">${html}</div></div>`;
  setTimeout(() => $("#modal-root input:not([type=hidden]):not([type=radio])")?.focus(), 50);
}
const closeModal = () => { $("#modal-root").innerHTML = ""; };
const sheetHead = (title) => `<div class="sheet-head"><h3>${title}</h3><button class="icon-btn" data-action="close" aria-label="Chiudi">${ic("close")}</button></div>`;

let toastTimer;
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

// ---------- Login ----------
function openLogin() {
  openModal(`
    ${sheetHead("Area riservata")}
    <p class="muted">Inserisci la password per aggiornare risultati, formazioni e date.</p>
    <form id="f-login">
      <input type="password" id="pwd" autocomplete="current-password" placeholder="Password" required>
      <div class="err" id="login-err"></div>
      <div class="btns"><button class="btn primary" type="submit">Accedi</button></div>
    </form>`);
}

function openAccount() {
  openModal(`
    ${sheetHead("Modalità inserimento")}
    <p class="muted">Sei collegato e puoi inserire o modificare i risultati.</p>
    <div class="btns"><button class="btn" data-action="close">Chiudi</button><button class="btn primary" data-action="logout">Esci</button></div>`);
}

// L'accesso resta memorizzato su questo dispositivo finché non si preme «Esci»
const ADMIN_KEY = "calciobalilla-admin";
function setAdmin(on) {
  state.user = on;
  try { on ? localStorage.setItem(ADMIN_KEY, "1") : localStorage.removeItem(ADMIN_KEY); } catch {}
  render();
}

function doLogin() {
  if ($("#pwd").value.trim() !== CONFIG.password) { $("#login-err").textContent = "Password errata."; return; }
  closeModal();
  setAdmin(true);
  toast("Accesso effettuato");
}

function doLogout() {
  closeModal();
  setAdmin(false);
  toast("Sei uscito dalla modalità inserimento");
}

// ---------- Inserimento risultato ----------
function openEdit(id) {
  const base = MATCHES.find((x) => x.id === id);
  if (!base) return;
  const m = info(base);
  const real = state.risultati[id] || {};
  const mia = isMia(m);

  let body;
  if (mia) {
    const avvId = m.casa === MIA ? m.ospite : m.casa;
    const avv = TEAM[avvId].nome;
    // suggerimenti: nomi avversari già inseriti in altre partite contro la stessa squadra
    const noti = new Set();
    Object.entries(state.risultati).forEach(([rid, r]) => {
      const mm = MATCHES.find((x) => x.id === rid);
      if (mm && (mm.casa === avvId || mm.ospite === avvId)) (r.set || []).forEach((s) => (s?.avversari || []).forEach((n) => n && noti.add(n)));
    });
    body = `<datalist id="dl-avv">${[...noti].sort().map((n) => `<option value="${esc(n)}">`).join("")}</datalist>
      <p class="muted">Per ogni set scegli la coppia del ${esc(TEAM[MIA].nome)}, scrivi gli avversari di ${esc(avv)} e l'esito delle ${F.partitePerSet} partite (V = vinta, P = persa).</p>`;
    for (let t = 0; t < F.turni; t++) {
      body += `<div class="turno-title">Turno ${t + 1}</div>`;
      for (let k = 0; k < F.setPerTurno; k++) {
        const s = t * F.setPerTurno + k;
        const st = real.set?.[s] || {};
        const sel = Array.from({ length: F.giocatoriPerSet }, (_, g) => {
          const cur = st.giocatori?.[g];
          // un ex giocatore già inserito in questo set resta selezionabile
          const opzioni = cur && PLAYER[cur] && !PLAYER[cur].attivo ? [...ROSA_ATTIVI, PLAYER[cur]] : ROSA_ATTIVI;
          return `
          <select name="s${s}g${g}" aria-label="Turno ${t + 1} set ${k + 1} giocatore ${g + 1}">
            <option value="">Giocatore ${g + 1}</option>
            ${opzioni.map((p) => `<option value="${p.id}" ${cur === p.id ? "selected" : ""}>${esc(p.nome)}</option>`).join("")}
          </select>`;
        }).join("");
        const avvInput = Array.from({ length: F.giocatoriPerSet }, (_, g) =>
          `<input type="text" name="s${s}a${g}" list="dl-avv" placeholder="Avversario ${g + 1}" value="${esc(st.avversari?.[g] || "")}" autocomplete="off" autocapitalize="words">`
        ).join("");
        const partite = Array.from({ length: F.partitePerSet }, (_, j) => {
          const cur = st.esiti?.[j] || "";
          const radio = (v, l) => `<label><input type="radio" name="s${s}e${j}" value="${v}" ${cur === v ? "checked" : ""}><span>${l}</span></label>`;
          return `<div class="seg-row"><span class="seg-lbl">P${j + 1}</span><div class="seg">${radio("V", "V")}${radio("P", "P")}${radio("", "–")}</div></div>`;
        }).join("");
        body += `
          <div class="pblock">
            <div class="pblock-title">Set ${k + 1}</div>
            <div class="row">${sel}</div>
            <div class="row avv-row"><span class="vs-lbl">vs</span>${avvInput}</div>
            <div class="seg-grid">${partite}</div>
          </div>`;
      }
    }
  } else {
    body = `
      <p class="muted">Punti = partite vinte (${TOT_PUNTI} in palio).</p>
      <div class="row">
        <label class="field">Punti ${esc(TEAM[m.casa].nome)}<input type="number" name="vc" min="0" max="${TOT_PUNTI}" inputmode="numeric" value="${real.vintiCasa ?? ""}" data-complemento="vo"></label>
        <label class="field">Punti ${esc(TEAM[m.ospite].nome)}<input type="number" name="vo" min="0" max="${TOT_PUNTI}" inputmode="numeric" value="${real.vintiOspite ?? ""}" data-complemento="vc"></label>
      </div>`;
  }

  openModal(`
    ${sheetHead(ord(m.giornata))}
    <div class="vs">${badge(m.casa)} ${esc(TEAM[m.casa].nome)} <span class="x">vs</span> ${esc(TEAM[m.ospite].nome)} ${badge(m.ospite)}</div>
    <form id="f-edit" data-id="${id}">
      <div class="row">
        <label class="field">Data<input type="date" name="data" value="${esc(m.data)}"></label>
        <label class="field">Ora<input type="time" name="ora" value="${esc(m.ora)}"></label>
      </div>
      ${body}
      ${mia ? `<div class="tot-live" id="tot-live"></div>` : ""}
      <div class="err" id="edit-err"></div>
      <div class="btns">
        ${state.risultati[id] ? `<button type="button" class="btn danger" data-action="delete" data-id="${id}">Cancella</button>` : ""}
        <button type="button" class="btn" data-action="close">Annulla</button>
        <button type="submit" class="btn primary">Salva</button>
      </div>
    </form>`);
}

async function saveEdit(form) {
  const id = form.dataset.id;
  const m = MATCHES.find((x) => x.id === id);
  const fd = new FormData(form);
  const err = $("#edit-err");
  const payload = { data: fd.get("data") || "", ora: fd.get("ora") || "" };

  if (isMia(m)) {
    const set = [];
    for (let s = 0; s < N_SET; s++) {
      const giocatori = Array.from({ length: F.giocatoriPerSet }, (_, g) => fd.get(`s${s}g${g}`)).filter(Boolean);
      const esiti = Array.from({ length: F.partitePerSet }, (_, j) => fd.get(`s${s}e${j}`) || null);
      const giocato = esiti.some(Boolean);
      if (giocato && (giocatori.length !== F.giocatoriPerSet || new Set(giocatori).size !== giocatori.length)) {
        err.textContent = `${setLabel(s)}: seleziona ${F.giocatoriPerSet} giocatori diversi.`;
        return;
      }
      const avversari = Array.from({ length: F.giocatoriPerSet }, (_, g) => String(fd.get(`s${s}a${g}`) || "").trim());
      set.push({ giocatori, avversari, esiti });
    }
    const tutti = set.flatMap((s) => s.esiti);
    const v = tutti.filter((e) => e === "V").length;
    const p = tutti.filter((e) => e === "P").length;
    payload.set = set;
    payload.vintiCasa = m.casa === MIA ? v : p;
    payload.vintiOspite = m.casa === MIA ? p : v;
  } else {
    const num = (x) => Math.min(TOT_PUNTI, Math.max(0, parseInt(x, 10) || 0));
    payload.vintiCasa = num(fd.get("vc"));
    payload.vintiOspite = num(fd.get("vo"));
  }

  if (!state.fb) { err.textContent = "Connessione a Firebase non disponibile, riprova più tardi."; return; }
  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    const { fs, db } = state.fb;
    await fs.setDoc(fs.doc(db, "risultati", id), { ...payload, aggiornato: fs.serverTimestamp() });
    closeModal();
    toast("Salvato");
  } catch (e) {
    console.error(e);
    err.textContent = "Salvataggio non riuscito: " + (e.code || e.message);
    btn.disabled = false;
  }
}

async function deleteResult(id) {
  if (!confirm("Cancellare il risultato e le eventuali modifiche di data/ora di questa partita?")) return;
  if (!state.fb) { $("#edit-err").textContent = "Connessione a Firebase non disponibile."; return; }
  try {
    const { fs, db } = state.fb;
    await fs.deleteDoc(fs.doc(db, "risultati", id));
    closeModal();
    toast("Risultato cancellato");
  } catch (e) {
    console.error(e);
    $("#edit-err").textContent = "Cancellazione non riuscita: " + (e.code || e.message);
  }
}

// =====================================================================
//  Eventi
// =====================================================================
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-overlay],[data-action],[data-nav],[data-team],[data-step],[data-filtro],[data-expand],[data-edit],#btn-admin");
  if (!el) return;
  if (el.hasAttribute("data-overlay")) { if (e.target === el) closeModal(); return; }
  const d = el.dataset;
  if (d.action === "close") closeModal();
  else if (d.action === "logout") doLogout();
  else if (d.action === "delete") deleteResult(d.id);
  else if (d.action === "rosa") openRosa();
  else if (d.action?.startsWith("rosa-")) rosaAction(d.action, d.id);
  else if (d.nav) { if (location.hash === "#" + d.nav) route(); else location.hash = d.nav; }
  else if (d.team) location.hash = `calendario/${d.team}`;
  else if (d.step) {
    const i = GIORNATE.indexOf(state.giornata) + Number(d.step);
    if (i >= 0 && i < GIORNATE.length) { state.giornata = GIORNATE[i]; render(); }
  }
  else if (d.filtro) { state.filtroMia = d.filtro; render(); }
  else if (d.expand) { state.expanded.has(d.expand) ? state.expanded.delete(d.expand) : state.expanded.add(d.expand); render(); }
  else if (d.edit) { openEdit(d.edit); aggiornaTotale(); }
  else if (el.id === "btn-admin") state.user ? openAccount() : openLogin();
});

// ---------- Gestione giocatori ----------
let rosaBozza = [];
const nuovoId = () => "g" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

// giocatori presenti in risultati reali (non di esempio): non si possono eliminare, solo togliere dalla squadra
function usatiReali() {
  const u = new Set();
  Object.values(state.risultati).forEach((r) => (r.set || []).forEach((s) => {
    if ((s?.esiti || []).some(Boolean)) (s.giocatori || []).forEach((id) => u.add(id));
  }));
  return u;
}

function syncRosa() {
  document.querySelectorAll("#rosa-list [data-rid]").forEach((inp) => {
    const p = rosaBozza.find((x) => x.id === inp.dataset.rid);
    if (p) p.nome = inp.value;
  });
}

function renderRosa() {
  const usati = usatiReali();
  $("#rosa-list").innerHTML = rosaBozza.map((p) => `
    <div class="rosa-row ${p.attivo ? "" : "off"}">
      <input type="text" data-rid="${p.id}" value="${esc(p.nome)}" placeholder="Nome giocatore" autocapitalize="words" autocomplete="off">
      ${usati.has(p.id)
        ? `<button type="button" class="rosa-btn" data-action="rosa-toggle" data-id="${p.id}">${p.attivo ? "Togli" : "Rimetti"}</button>`
        : `<button type="button" class="rosa-btn del" data-action="rosa-del" data-id="${p.id}" aria-label="Elimina ${esc(p.nome)}">${ic("close")}</button>`}
    </div>`).join("") || `<div class="muted">Nessun giocatore.</div>`;
}

function openRosa() {
  rosaBozza = ROSA.map((p) => ({ ...p }));
  openModal(`
    ${sheetHead("Giocatori della squadra")}
    <p class="muted">Modifica i nomi o aggiungi nuovi giocatori. Chi ha già giocato non si può eliminare: con «Togli» esce dai menu ma resta nelle statistiche.</p>
    <form id="f-rosa">
      <div id="rosa-list"></div>
      <button type="button" class="btn-add" data-action="rosa-add">+ Aggiungi giocatore</button>
      <div class="err" id="rosa-err"></div>
      <div class="btns"><button type="button" class="btn" data-action="close">Annulla</button><button type="submit" class="btn primary">Salva</button></div>
    </form>`);
  renderRosa();
}

function rosaAction(action, id) {
  syncRosa();
  if (action === "rosa-add") {
    rosaBozza.push({ id: nuovoId(), nome: "", attivo: true });
    renderRosa();
    const inputs = document.querySelectorAll("#rosa-list input");
    inputs[inputs.length - 1]?.focus();
    return;
  }
  if (action === "rosa-del") rosaBozza = rosaBozza.filter((p) => p.id !== id);
  if (action === "rosa-toggle") { const p = rosaBozza.find((x) => x.id === id); if (p) p.attivo = !p.attivo; }
  renderRosa();
}

async function saveRosa(form) {
  syncRosa();
  const err = $("#rosa-err");
  const usati = usatiReali();
  const lista = [];
  const visti = new Set();
  for (const p of rosaBozza) {
    const nome = p.nome.trim().replace(/\s+/g, " ");
    if (!nome) {
      if (usati.has(p.id)) { err.textContent = "Un giocatore che ha già giocato deve avere un nome."; return; }
      continue; // riga vuota: ignorata
    }
    const key = nome.toLocaleLowerCase("it");
    if (visti.has(key)) { err.textContent = `«${nome}» compare due volte.`; return; }
    visti.add(key);
    lista.push({ id: p.id, nome, attivo: p.attivo });
  }
  if (!state.fb) { err.textContent = "Connessione a Firebase non disponibile, riprova più tardi."; return; }
  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    const { fs, db } = state.fb;
    await fs.setDoc(fs.doc(db, "impostazioni", "giocatori"), { lista, aggiornato: fs.serverTimestamp() });
    setRosa(lista);
    closeModal();
    render();
    toast("Giocatori salvati");
  } catch (e) {
    console.error(e);
    err.textContent = "Salvataggio non riuscito: " + (e.code || e.message);
    btn.disabled = false;
  }
}

// Totale in tempo reale nella maschera della mia squadra
function aggiornaTotale() {
  const box = $("#tot-live");
  const form = $("#f-edit");
  if (!box || !form) return;
  const fd = new FormData(form);
  let v = 0, p = 0;
  for (const [k, val] of fd.entries()) if (/^s\d+e\d+$/.test(k)) { if (val === "V") v++; else if (val === "P") p++; }
  box.innerHTML = `Punti ${esc(TEAM[MIA].nome)}: <b>${v}</b> · avversari: <b>${p}</b> <span class="muted">(${v + p}/${TOT_PUNTI} partite)</span>`;
}

document.addEventListener("change", (e) => {
  if (e.target.id === "sel-giornata") { state.giornata = Number(e.target.value); render(); }
  if (e.target.closest("#f-edit")) aggiornaTotale();
});

// Partite altrui: scrivendo i punti di una squadra si completa l'altra (18 - x)
document.addEventListener("input", (e) => {
  const other = e.target.dataset?.complemento;
  if (!other || e.target.value === "") return;
  const x = Math.min(TOT_PUNTI, Math.max(0, parseInt(e.target.value, 10) || 0));
  const o = document.querySelector(`#f-edit [name="${other}"]`);
  if (o) o.value = TOT_PUNTI - x;
});

document.addEventListener("submit", (e) => {
  e.preventDefault();
  if (e.target.id === "f-login") doLogin(e.target);
  if (e.target.id === "f-edit") saveEdit(e.target);
  if (e.target.id === "f-rosa") saveRosa(e.target);
});

document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
window.addEventListener("hashchange", route);

// =====================================================================
//  Firebase (caricato dinamicamente: se non è raggiungibile il sito funziona lo stesso)
// =====================================================================
async function initFirebase() {
  try {
    const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/`;
    const [appM, fs] = await Promise.all([
      import(base + "firebase-app.js"),
      import(base + "firebase-firestore.js"),
    ]);
    const app = appM.initializeApp(firebaseConfig);
    const db = fs.getFirestore(app);
    state.fb = { db, fs };
    fs.onSnapshot(
      fs.doc(db, "impostazioni", "giocatori"),
      (snap) => {
        const lista = snap.exists() ? snap.data().lista : null;
        if (Array.isArray(lista) && lista.length) { setRosa(lista); render(); }
      },
      (err) => console.error(err)
    );
    fs.onSnapshot(
      fs.collection(db, "risultati"),
      (snap) => {
        const r = {};
        snap.forEach((d) => { r[d.id] = d.data(); });
        state.risultati = r;
        state.fbStatus = "ok";
        render();
      },
      (err) => { console.error(err); state.fbStatus = "error"; render(); }
    );
  } catch (e) {
    console.warn("Firebase non disponibile:", e);
    state.fbStatus = "offline";
    render();
  }
}

// =====================================================================
//  Avvio
// =====================================================================
$("#brand-title").textContent = CONFIG.titolo;
$("#brand-sub").textContent = CONFIG.sottotitolo;
document.title = `${CONFIG.titolo} · ${TEAM[MIA]?.nome || ""}`;
state.demo = generaDemo();
try { state.user = localStorage.getItem(ADMIN_KEY) === "1"; } catch {}
route();
initFirebase();
