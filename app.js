import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import * as C from './config.js';

const sb = createClient(C.SUPABASE_URL, C.SUPABASE_KEY);
const NSLOTS = (C.DAG_EIND - C.DAG_START) / C.BLOK; // 38 blokken van 15 min

// ===================================================================
// Hulpfuncties
// ===================================================================
const pad = (n) => String(n).padStart(2, '0');
const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; };
const atMin = (d, min) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(min / 60), min % 60);
const minOfDay = (dt) => dt.getHours() * 60 + dt.getMinutes();
const fmtMin = (m) => `${Math.floor(m / 60)}:${pad(m % 60)}`;
const fmtTime = (dt) => fmtMin(minOfDay(dt));
const today = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
const sameDay = (a, b) => key(a) === key(b);
const isOpen = (d) => C.OPEN_DAGEN.includes(d.getDay());
const nextOpen = (d, dir = 1) => { let x = d; for (let i = 0; i < 7 && !isOpen(x); i++) x = addDays(x, dir); return x; };
const monday = (d) => addDays(d, 1 - (d.getDay() || 7));
function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - y0) / 86400000 + 1) / 7);
}
const DAGEN = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
const DAGK = ['ZO', 'MA', 'DI', 'WO', 'DO', 'VR', 'ZA'];
const MAAND = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const COPYRIGHT = '© 2026 Ilja Lemmens · Gemaakt voor Kapsalon van de Ven';
const MAANDLANG = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const fmtDate = (d) => `${DAGK[d.getDay()].toLowerCase()} ${d.getDate()} ${MAAND[d.getMonth()]}`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cssVarPx = (name) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 24;
const tijdOpties = (sel, vanaf = C.DAG_START, tot = C.DAG_EIND) => {
  let h = '';
  for (let m = vanaf; m <= tot; m += C.BLOK) h += `<option value="${m}" ${m === sel ? 'selected' : ''}>${fmtMin(m)}</option>`;
  return h;
};

const ICON = {
  left: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  right: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
  down: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:6px;opacity:.7"><path d="M6 9l6 6 6-6"/></svg>',
  plus: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  close: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  cal: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  users: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.5a3.5 3.5 0 010 7M18 14.8c1.9.7 3.1 2.5 3.5 5.2"/></svg>',
  gear: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1"/></svg>',
  check: '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>',
};

// ---------- Geluiden (per apparaat aan/uit, standaard uit) ----------
let audio = null;
let eigenWijziging = 0; // tijdstip van eigen opslaan, om geen belletje voor jezelf te geven
const geluidAan = () => { try { return localStorage.getItem('geluid') === '1'; } catch { return false; } };
function audioCtx() {
  if (!audio) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; audio = new AC(); }
  if (audio.state === 'suspended') audio.resume();
  return audio;
}
function toon(freq, start, duur, type = 'sine', volume = 0.15) {
  const ctx = audioCtx(); if (!ctx) return;
  const t = ctx.currentTime + start;
  const osc = ctx.createOscillator(), g = ctx.createGain();
  osc.type = type; osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t); osc.stop(t + duur + 0.02);
}
function speel(soort, ookAlsUit = false) {
  if (!ookAlsUit && !geluidAan()) return;
  if (soort === 'ok') { toon(880, 0, 0.09); toon(1320, 0.08, 0.12); }
  else if (soort === 'fout') { toon(330, 0, 0.14, 'triangle', 0.2); toon(262, 0.15, 0.2, 'triangle', 0.2); }
  else if (soort === 'nieuw') { toon(1046, 0, 0.6, 'sine', 0.12); toon(1568, 0.12, 0.7, 'sine', 0.09); }
}
// Browsers starten geluid pas na een tik van de gebruiker
document.addEventListener('pointerdown', () => { if (geluidAan()) audioCtx(); }, { passive: true });

let toastTimer;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

function foutmelding(err) {
  if (!err) return 'Onbekende fout';
  if (err.code === '23P01') return 'Dit tijdslot is net bezet geraakt. Kies een andere tijd.';
  if (err.code === '42501') return 'Dit account mag alleen lezen, niet wijzigen.';
  return err.message || String(err);
}

// ===================================================================
// Toestand
// ===================================================================
const S = {
  session: null,
  view: 'dag',
  date: nextOpen(today()),
  meds: [],
  beh: [],
  appts: [],
  afw: [],
  kq: '',
  klanten: [],
  afwLijst: [],
  sluit: [],
  sheet: null,
};

// Sluitingsdag (gesloten) op deze datum, of null
const geslotenOp = (d) => {
  const k = key(d);
  return S.sluit.find((s) => s.gesloten && s.van <= k && k <= s.tot) || null;
};

// Nederlandse feestdagen die op een openingsdag (di–za) vallen
function pasen(j) { // anonieme Gregoriaanse berekening
  const a = j % 19, b = Math.floor(j / 100), c = j % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const maand = Math.floor((h + l - 7 * m + 114) / 31), dag = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(j, maand - 1, dag);
}
function feestdagen(j) {
  const p = pasen(j);
  const koning = new Date(j, 3, 27);
  if (koning.getDay() === 0) koning.setDate(26); // valt 27 april op zondag, dan zaterdag 26
  return [
    [new Date(j, 0, 1), 'Nieuwjaarsdag'],
    [addDays(p, -2), 'Goede Vrijdag'],
    [koning, 'Koningsdag'],
    [new Date(j, 4, 5), 'Bevrijdingsdag'],
    [addDays(p, 39), 'Hemelvaartsdag'],
    [new Date(j, 11, 25), 'Eerste Kerstdag'],
    [new Date(j, 11, 26), 'Tweede Kerstdag'],
  ].filter(([d]) => isOpen(d)).map(([d, naam]) => ({ datum: key(d), naam }));
}
const actieveMeds = () => S.meds.filter((m) => m.actief);
const medById = (id) => S.meds.find((m) => m.id === id);
const behNamen = (a) => (a.afspraak_behandelingen || []).map((x) => x.behandeling?.naam).filter(Boolean).join(' + ');

// ===================================================================
// Gegevens ophalen
// ===================================================================
async function loadBase() {
  const [m, b, z] = await Promise.all([
    sb.from('medewerkers').select('*').order('id'),
    sb.from('behandelingen').select('*').order('volgorde').order('id'),
    sb.from('sluitingsdagen').select('*').order('van'),
  ]);
  if (m.error) throw m.error;
  if (b.error) throw b.error;
  S.meds = m.data;
  S.beh = b.data;
  S.sluit = z.error ? [] : z.data; // tabel ontbreekt nog? dan gewoon zonder
}

async function fetchRange(from, to) {
  const [a, w] = await Promise.all([
    sb.from('afspraken')
      .select('*, klant:klanten(id,naam,telefoon), afspraak_behandelingen(behandeling:behandelingen(id,naam))')
      .eq('geannuleerd', false)
      .gte('start_tijd', from.toISOString())
      .lt('start_tijd', to.toISOString())
      .order('start_tijd'),
    sb.from('afwezigheid').select('*')
      .lt('start_tijd', to.toISOString())
      .gt('eind_tijd', from.toISOString()),
  ]);
  if (a.error) throw a.error;
  if (w.error) throw w.error;
  return { appts: a.data, afw: w.data };
}

function huidigBereik() {
  if (S.view === 'week') {
    const ma = monday(S.date);
    return { from: addDays(ma, 1), to: addDays(ma, 6) };
  }
  return { from: S.date, to: addDays(S.date, 1) };
}

async function loadRange() {
  const { from, to } = huidigBereik();
  const r = await fetchRange(from, to);
  S.appts = r.appts;
  S.afw = r.afw;
}

async function loadKlanten() {
  let q = sb.from('klanten').select('*').order('naam').limit(60);
  const zoek = S.kq.trim().replace(/[,()%*]/g, ' ').trim();
  if (zoek) q = q.or(`naam.ilike.%${zoek}%,telefoon.ilike.%${zoek}%`);
  const { data, error } = await q;
  if (error) throw error;
  S.klanten = data;
}

async function loadAfwLijst() {
  const { data, error } = await sb.from('afwezigheid').select('*')
    .gte('eind_tijd', today().toISOString()).order('start_tijd');
  if (error) throw error;
  S.afwLijst = data;
}

async function refresh() {
  try {
    if (S.view === 'dag' || S.view === 'week') await Promise.all([loadRange(), loadBase()]);
    else if (S.view === 'klanten') await loadKlanten();
    else if (S.view === 'instellingen') await Promise.all([loadBase(), loadAfwLijst()]);
    render();
  } catch (e) { toast(foutmelding(e)); }
}

// Bezette blokken voor één medewerker op één dag
function bezet(medId, date, appts, afw) {
  const b = new Array(NSLOTS).fill(false);
  const start = atMin(date, C.DAG_START).getTime();
  const markeer = (s, e) => {
    const a = Math.max(0, Math.floor((s - start) / 60000 / C.BLOK));
    const z = Math.min(NSLOTS, Math.ceil((e - start) / 60000 / C.BLOK));
    for (let i = a; i < z; i++) b[i] = true;
  };
  appts.filter((x) => x.medewerker_id === medId).forEach((x) => markeer(new Date(x.start_tijd).getTime(), new Date(x.eind_tijd).getTime()));
  afw.filter((x) => x.medewerker_id === medId).forEach((x) => markeer(new Date(x.start_tijd).getTime(), new Date(x.eind_tijd).getTime()));
  return b;
}

function vrijeStarts(busy, n, date) {
  const res = [];
  const nu = new Date();
  for (let i = 0; i + n <= NSLOTS; i++) {
    if (busy.slice(i, i + n).some(Boolean)) continue;
    if (atMin(date, C.DAG_START + i * C.BLOK) <= nu) continue;
    res.push(i);
  }
  return res;
}

// ===================================================================
// Weergave: hoofdscherm
// ===================================================================
const app = document.getElementById('app');
const sheetEl = document.getElementById('sheet');

function render() {
  if (!S.session) { app.innerHTML = loginHtml(); return; }
  const oud = document.getElementById('scroll');
  const bewaar = oud && oud.dataset.view === S.view + key(S.date) ? oud.scrollTop : null;
  app.innerHTML = shellHtml();
  S.anim = null;
  const sc = document.getElementById('scroll');
  if (sc) {
    if (bewaar !== null) sc.scrollTop = bewaar;
    else if (S.view === 'dag' && sameDay(S.date, today())) {
      const m = minOfDay(new Date()) - C.DAG_START - 60;
      sc.scrollTop = Math.max(0, (m / C.BLOK) * cssVarPx('--slot'));
    }
  }
}

function loginHtml(fout = '') {
  return `<div class="login"><form data-form="login">
    <div class="brand">KAPSALON VAN DE VEN</div>
    <div class="field"><label for="em">E-mail</label><input class="input" id="em" name="email" type="email" autocomplete="username" required></div>
    <div class="field"><label for="pw">Wachtwoord</label><input class="input" id="pw" name="password" type="password" autocomplete="current-password" required></div>
    ${fout ? `<div class="err">${esc(fout)}</div>` : ''}
    <button class="primary" type="submit">Inloggen</button>
    <p class="copy">${COPYRIGHT}</p>
  </form></div>`;
}

function shellHtml() {
  const agenda = S.view === 'dag' || S.view === 'week';
  let kicker = '', titel = '';
  if (S.view === 'dag') {
    kicker = `WEEK ${isoWeek(S.date)}`;
    titel = `${cap(DAGEN[S.date.getDay()])} ${S.date.getDate()} ${MAAND[S.date.getMonth()]}`;
  } else if (S.view === 'week') {
    const ma = monday(S.date);
    kicker = `${addDays(ma, 1).getDate()} ${MAAND[addDays(ma, 1).getMonth()]} – ${addDays(ma, 5).getDate()} ${MAAND[addDays(ma, 5).getMonth()]} ${addDays(ma, 5).getFullYear()}`;
    titel = `Week ${isoWeek(S.date)}`;
  } else if (S.view === 'klanten') titel = 'Klanten';
  else titel = 'Instellingen';

  let inhoud = '';
  if (S.view === 'dag') inhoud = dagHtml();
  else if (S.view === 'week') inhoud = weekHtml();
  else if (S.view === 'klanten') inhoud = klantenHtml();
  else inhoud = instellingenHtml();

  return `<div class="shell">
    <header class="top">
      <div class="brandrow"><span class="brand">KAPSALON VAN DE VEN</span>
        ${agenda ? `<button class="textbtn" data-action="vandaag">Vandaag</button>` : ''}</div>
      <div class="titlerow">
        ${agenda
          ? `<button class="titelknop" data-action="kalender" aria-label="Kies een datum in de kalender"><span class="kicker">${esc(kicker)}</span><span class="h1">${esc(titel)}${ICON.down}</span></button>`
          : `<div><div class="kicker">${esc(kicker)}</div><h1>${esc(titel)}</h1></div>`}
        ${agenda ? `<div class="navbtns">
          <button class="iconbtn" data-action="prev" aria-label="Vorige">${ICON.left}</button>
          <button class="iconbtn" data-action="next" aria-label="Volgende">${ICON.right}</button></div>` : ''}
      </div>
      ${agenda ? `<div class="seg">
        <button class="${S.view === 'dag' ? 'on' : ''}" data-action="view" data-v="dag">Dag</button>
        <button class="${S.view === 'week' ? 'on' : ''}" data-action="view" data-v="week">Week</button></div>` : ''}
    </header>
    <main class="${S.anim ? 'veeg-' + S.anim : ''}">${inhoud}</main>
    ${agenda ? `<button class="fab" data-action="nieuw">${ICON.plus}Afspraak</button>` : ''}
    <nav class="bottomnav">
      <button class="${agenda ? 'on' : ''}" data-action="view" data-v="dag">${ICON.cal}Agenda</button>
      <button class="${S.view === 'klanten' ? 'on' : ''}" data-action="view" data-v="klanten">${ICON.users}Klanten</button>
      <button class="${S.view === 'instellingen' ? 'on' : ''}" data-action="view" data-v="instellingen">${ICON.gear}Instellingen</button>
    </nav>
  </div>`;
}

function tijdkolom(slotPx) {
  let h = '';
  for (let m = C.DAG_START; m <= C.DAG_EIND - 30; m += 60) h += `<span style="top:${((m - C.DAG_START) / C.BLOK) * slotPx}px">${fmtMin(m)}</span>`;
  return `<div class="timecol">${h}</div>`;
}

function afwBlok(a, date, slotPx, cls) {
  const ds = atMin(date, C.DAG_START), de = atMin(date, C.DAG_EIND);
  const s = Math.max(new Date(a.start_tijd), ds), e = Math.min(new Date(a.eind_tijd), de);
  if (e <= s) return '';
  const top = ((s - ds) / 60000 / C.BLOK) * slotPx;
  const h = ((e - s) / 60000 / C.BLOK) * slotPx;
  if (cls === 'wafw') return `<div class="wafw" style="top:${top + 1}px;height:${h - 2}px" title="${esc(a.reden || 'Afwezig')}"></div>`;
  return `<div class="afw" style="top:${top + 2}px;height:${h - 4}px">${esc(a.reden || 'Afwezig')}</div>`;
}

function dagHtml() {
  if (!isOpen(S.date)) return `<div class="closed">Op ${DAGEN[S.date.getDay()]} is de salon gesloten.</div>`;
  const dicht = geslotenOp(S.date);
  if (dicht && !S.appts.length) return `<div class="closed"><b style="color:var(--text);font-size:18px">Gesloten</b><br>${esc(dicht.omschrijving || 'Sluitingsdag')}</div>`;
  const banner = dicht ? `<div class="banner">Gesloten (${esc(dicht.omschrijving || 'sluitingsdag')}), maar er staan nog afspraken. Verplaats of annuleer ze.</div>` : '';
  const meds = actieveMeds();
  const slotPx = cssVarPx('--slot');
  const cols = `40px repeat(${meds.length}, minmax(0, 1fr))`;
  const ds = atMin(S.date, C.DAG_START);
  const isVandaag = sameDay(S.date, today());
  const nuMin = minOfDay(new Date());
  const nuLijn = isVandaag && nuMin >= C.DAG_START && nuMin <= C.DAG_EIND
    ? `<div class="nowline" style="top:${((nuMin - C.DAG_START) / C.BLOK) * slotPx}px"></div>` : '';

  const kolommen = meds.map((m) => {
    const appts = S.appts.filter((a) => a.medewerker_id === m.id).map((a) => {
      const s = new Date(a.start_tijd), e = new Date(a.eind_tijd);
      const n = Math.round((e - s) / 60000 / C.BLOK);
      const top = ((s - ds) / 60000 / C.BLOK) * slotPx;
      const st = `top:${top + 2}px;height:${n * slotPx - 4}px;background:${m.kleur}2E;border-color:${m.kleur}8C`;
      const naam = a.klant?.naam || '';
      const beh = behNamen(a);
      if (n <= 1) return `<div class="appt kort" style="${st}" data-action="appt" data-id="${a.id}"><b class="t1">${fmtTime(s)}</b><span class="k">${esc(naam || beh)}</span></div>`;
      if (n === 2) return `<div class="appt mid" style="${st}" data-action="appt" data-id="${a.id}">
        <span class="r1"><b class="t1">${fmtTime(s)}</b><span class="k">${esc(naam || '—')}</span></span>
        <span class="b">${esc(beh)}</span></div>`;
      return `<div class="appt" style="${st}" data-action="appt" data-id="${a.id}">
        <span class="t">${fmtTime(s)} – ${fmtTime(e)}</span>
        <span class="k">${esc(naam || '—')}</span>
        <span class="b">${esc(beh)}</span></div>`;
    }).join('');
    const afw = S.afw.filter((a) => a.medewerker_id === m.id).map((a) => afwBlok(a, S.date, slotPx, 'afw')).join('');
    return `<div class="col" data-action="slot" data-med="${m.id}">${afw}${appts}${nuLijn}</div>`;
  }).join('');

  return `${banner}<div class="dayhead" style="grid-template-columns:${cols}"><span></span>
      ${meds.map((m) => `<div class="staffname"><span class="dot" style="background:${m.kleur}"></span>${esc(m.naam)}</div>`).join('')}
    </div>
    <div class="scroll" id="scroll" data-view="dag${key(S.date)}">
      <div class="daygrid" style="grid-template-columns:${cols};height:${NSLOTS * slotPx}px">${tijdkolom(slotPx)}${kolommen}</div>
    </div>`;
}

function weekHtml() {
  const meds = actieveMeds();
  const slotPx = cssVarPx('--slot-week');
  const ma = monday(S.date);
  const dagen = [1, 2, 3, 4, 5].map((i) => addDays(ma, i));
  const kop = dagen.map((d) => `<button class="wday ${sameDay(d, today()) ? 'today' : ''}" data-action="goday" data-date="${key(d)}">
      <span class="dw">${DAGK[d.getDay()]}</span><span class="dt">${d.getDate()}</span></button>`).join('');
  const kolommen = dagen.map((d) => {
    const dicht = geslotenOp(d);
    if (dicht) return `<div class="wcol wdicht"><span>Gesloten<br>${esc(dicht.omschrijving || '')}</span></div>`;
    const ds = atMin(d, C.DAG_START);
    const subs = meds.map((m) => {
      const appts = S.appts.filter((a) => a.medewerker_id === m.id && sameDay(new Date(a.start_tijd), d)).map((a) => {
        const s = new Date(a.start_tijd), e = new Date(a.eind_tijd);
        const n = Math.round((e - s) / 60000 / C.BLOK);
        const top = ((s - ds) / 60000 / C.BLOK) * slotPx;
        const label = n >= 2 ? (a.klant?.naam || behNamen(a)) : '';
        const tip = `${fmtTime(s)} ${a.klant?.naam || ''} – ${behNamen(a)}`;
        return `<div class="wappt" style="top:${top + 1}px;height:${n * slotPx - 2}px;background:${m.kleur}33;border-color:${m.kleur}99" data-action="appt" data-id="${a.id}" title="${esc(tip)}">${esc(label)}</div>`;
      }).join('');
      const afw = S.afw.filter((a) => a.medewerker_id === m.id).map((a) => afwBlok(a, d, slotPx, 'wafw')).join('');
      return `<div class="wsub">${afw}${appts}</div>`;
    }).join('');
    return `<div class="wcol" style="grid-template-columns:repeat(${meds.length}, minmax(0, 1fr))">${subs}</div>`;
  }).join('');
  return `<div class="legend">${meds.map((m) => `<span><span class="dot" style="background:${m.kleur}"></span>${esc(m.naam)}</span>`).join('')}</div>
    <div class="weekhead"><span></span>${kop}</div>
    <div class="scroll" id="scroll" data-view="week${key(S.date)}">
      <div class="weekgrid" style="height:${NSLOTS * slotPx}px">${tijdkolom(slotPx)}${kolommen}</div>
    </div>`;
}

function klantRijen() {
  if (!S.klanten.length) return `<div class="empty">${S.kq ? 'Geen klanten gevonden.' : 'Nog geen klanten.'}</div>`;
  return S.klanten.map((k) => `<button class="row" data-action="klant" data-id="${k.id}">
      <span>${esc(k.naam)}<br><span class="sub">${esc(k.telefoon || '')}</span></span>${ICON.right}</button>`).join('');
}

function klantenHtml() {
  return `<div class="page">
    <div class="field"><label for="kzoek">Zoeken op naam of telefoon</label>
      <input class="input" id="kzoek" data-zoek="lijst" value="${esc(S.kq)}" autocomplete="off"></div>
    <div class="list" id="klijst">${klantRijen()}</div>
    <button class="secondary" data-action="nieuweklant">+ Nieuwe klant</button>
  </div>`;
}

function instellingenHtml() {
  const beh = S.beh.map((b) => `<button class="row ${b.actief ? '' : 'off'}" data-action="beh" data-id="${b.id}">
      <span>${esc(b.naam)}<br><span class="sub">${b.duur_min} min${b.actief ? '' : ' · niet actief'}</span></span>${ICON.right}</button>`).join('');
  const afw = S.afwLijst.length ? S.afwLijst.map((a) => {
    const s = new Date(a.start_tijd), e = new Date(a.eind_tijd);
    const periode = sameDay(s, e) ? `${fmtDate(s)} ${fmtTime(s)}–${fmtTime(e)}` : `${fmtDate(s)} ${fmtTime(s)} – ${fmtDate(e)} ${fmtTime(e)}`;
    return `<div class="row" style="cursor:default"><span>${esc(medById(a.medewerker_id)?.naam || '?')}${a.reden ? ' · ' + esc(a.reden) : ''}<br><span class="sub">${periode}</span></span>
      <button class="textbtn danger" style="color:var(--danger)" data-action="delafw" data-id="${a.id}">Verwijderen</button></div>`;
  }).join('') : '<div class="empty">Geen geplande afwezigheid.</div>';
  const vandaagK = key(today());
  const jaar = today().getFullYear();
  const sluit = S.sluit.filter((z) => z.tot >= vandaagK);
  const fmtK = (k) => fmtDate(fromKey(k)) + ' ' + k.slice(0, 4);
  const sluitRijen = sluit.length ? sluit.map((z) => `<div class="row ${z.gesloten ? '' : 'off'}" style="cursor:default">
      <span>${esc(z.omschrijving || 'Sluitingsdag')}<br><span class="sub">${z.van === z.tot ? fmtK(z.van) : fmtK(z.van) + ' t/m ' + fmtK(z.tot)} · ${z.gesloten ? 'gesloten' : 'toch open'}</span></span>
      <span class="acts">
        <button class="textbtn" data-action="sluittoggle" data-id="${z.id}">${z.gesloten ? 'Toch open' : 'Dicht'}</button>
        <button class="textbtn" style="color:var(--danger)" data-action="sluitdel" data-id="${z.id}" aria-label="Verwijderen">✕</button>
      </span></div>`).join('') : '<div class="empty">Geen sluitingsdagen gepland.</div>';
  return `<div class="page">
    <section><h2>SLUITINGSDAGEN / FEESTDAGEN</h2><div class="list">${sluitRijen}</div>
      <div class="two" style="margin-top:10px">
        <button class="secondary" data-action="feestdagen" data-jaar="${jaar}">Feestdagen ${jaar}</button>
        <button class="secondary" data-action="feestdagen" data-jaar="${jaar + 1}">Feestdagen ${jaar + 1}</button>
      </div>
      <button class="secondary" style="margin-top:10px" data-action="nieuwesluit">+ Sluitingsdag / salonvakantie</button></section>
    <section><h2>BEHANDELINGEN</h2><div class="list">${beh}</div>
      <button class="secondary" style="margin-top:10px" data-action="nieuwebeh">+ Behandeling</button></section>
    <section><h2>AFWEZIGHEID / VAKANTIE</h2><div class="list">${afw}</div>
      <button class="secondary" style="margin-top:10px" data-action="nieuweafw">+ Afwezigheid</button></section>
    <section><h2>DIT APPARAAT</h2>
      <div class="list"><div class="row" style="cursor:default">
        <label class="check" style="flex:1"><input type="checkbox" data-pref="geluid" ${geluidAan() ? 'checked' : ''}> Geluiden
          <span class="sub" style="margin-left:auto">opslaan, fout, nieuwe afspraak van collega</span></label>
      </div></div>
      <button class="secondary" style="margin-top:10px" data-action="testgeluid">Geluiden testen</button></section>
    <section><h2>ACCOUNT</h2><button class="secondary danger" data-action="logout">Uitloggen</button></section>
    <p class="copy">${COPYRIGHT}</p>
  </div>`;
}

// ===================================================================
// Weergave: pop-ups (sheets)
// ===================================================================
function renderSheet() {
  const F = S.sheet;
  if (!F) { sheetEl.innerHTML = ''; return; }
  const oudeBody = sheetEl.querySelector('.body');
  const scroll = oudeBody ? oudeBody.scrollTop : 0;
  let titel = '', body = '', footer = '';
  if (F.type === 'nieuw') ({ titel, body, footer } = nieuwSheet(F));
  else if (F.type === 'appt') ({ titel, body, footer } = apptSheet(F));
  else if (F.type === 'klant') ({ titel, body, footer } = klantSheet(F));
  else if (F.type === 'beh') ({ titel, body, footer } = behSheet(F));
  else if (F.type === 'afw') ({ titel, body, footer } = afwSheet(F));
  else if (F.type === 'sluit') ({ titel, body, footer } = sluitSheet(F));
  else if (F.type === 'kal') ({ titel, body, footer } = kalSheet(F));
  sheetEl.innerHTML = `<div class="overlay" data-action="sluitbuiten"><div class="panel" role="dialog" aria-modal="true" aria-label="${esc(titel)}">
    <header><h1>${esc(titel)}</h1><button class="iconbtn plain" data-action="sluit" aria-label="Sluiten">${ICON.close}</button></header>
    <div class="body">${body}</div>
    ${footer ? `<footer>${footer}</footer>` : ''}
  </div></div>`;
  const nb = sheetEl.querySelector('.body');
  if (nb) nb.scrollTop = scroll;
}

function closeSheet() { S.sheet = null; renderSheet(); }

// ---------- Nieuwe afspraak ----------
async function openNieuw(opts = {}) {
  const meds = actieveMeds();
  const d = opts.date ? fromKey(opts.date) : (isOpen(S.date) ? S.date : nextOpen(S.date));
  S.sheet = {
    type: 'nieuw',
    editId: null,
    klant: null, nieuweKlant: false, kq: '', results: [], kNaam: '', kTel: '',
    med: opts.med ?? meds[0]?.id,
    beh: [],
    date: key(d),
    slot: opts.slot ?? null,
    door: Number(localStorage.getItem('ingepland_door')) || null,
    notitie: '',
    dag: null,
    bezig: false,
  };
  if (opts.edit) {
    const a = opts.edit;
    const s = new Date(a.start_tijd);
    Object.assign(S.sheet, {
      editId: a.id,
      klant: a.klant || null,
      med: a.medewerker_id,
      beh: (a.afspraak_behandelingen || []).map((x) => x.behandeling?.id).filter(Boolean),
      date: key(s),
      slot: (minOfDay(s) - C.DAG_START) / C.BLOK,
      door: a.ingepland_door || S.sheet.door,
      notitie: a.notitie || '',
    });
  }
  renderSheet();
  await laadVrij();
}

async function laadVrij() {
  const F = S.sheet;
  if (!F || F.type !== 'nieuw') return;
  F.dag = null;
  renderSheet();
  try {
    const d = fromKey(F.date);
    F.dag = await fetchRange(d, addDays(d, 1));
  } catch (e) { toast(foutmelding(e)); }
  if (S.sheet === F) renderSheet();
}

function duurVan(F) {
  return F.beh.reduce((s, id) => s + (S.beh.find((b) => b.id === id)?.duur_min || 0), 0);
}

function vrijeTijden(F) {
  const d = fromKey(F.date);
  const n = duurVan(F) / C.BLOK;
  if (!F.dag || !n || !F.med || !isOpen(d) || geslotenOp(d)) return [];
  const appts = F.editId ? F.dag.appts.filter((a) => a.id !== F.editId) : F.dag.appts; // eigen afspraak telt niet als bezet
  return vrijeStarts(bezet(F.med, d, appts, F.dag.afw), n, d);
}

function klantResultaten(F) {
  if (!F.kq.trim()) return '';
  if (!F.results.length) return '<div class="hint">Geen klant gevonden.</div>';
  return `<div class="results">${F.results.map((k) => `<button data-action="kiesklant" data-id="${k.id}">${esc(k.naam)} <span class="hint">${esc(k.telefoon || '')}</span></button>`).join('')}</div>`;
}

function nieuwSheet(F) {
  const meds = actieveMeds();
  const d = fromKey(F.date);
  const duur = duurVan(F);
  const vrij = vrijeTijden(F);
  if (F.slot !== null && !vrij.includes(F.slot) && F.dag && duur) F.slot = null;

  let klant;
  if (F.klant) {
    klant = `<div class="picked"><span>${esc(F.klant.naam)}<br><span class="hint">${esc(F.klant.telefoon || '')}</span></span>
      <button class="textbtn" data-action="wisklant">Wijzigen</button></div>`;
  } else if (F.nieuweKlant) {
    klant = `<div class="two">
        <input class="input" data-bind="kNaam" placeholder="Naam" value="${esc(F.kNaam)}" aria-label="Naam nieuwe klant">
        <input class="input" data-bind="kTel" placeholder="Telefoon" inputmode="tel" value="${esc(F.kTel)}" aria-label="Telefoon nieuwe klant"></div>
      <button class="textbtn" style="align-self:flex-start" data-action="zoekklant">Bestaande klant zoeken</button>`;
  } else {
    klant = `<input class="input" id="kq" data-zoek="sheet" placeholder="Zoek op naam of telefoon" value="${esc(F.kq)}" autocomplete="off" aria-label="Klant zoeken">
      <div id="kresults">${klantResultaten(F)}</div>
      <button class="textbtn" style="align-self:flex-start" data-action="nieuweklantinline">+ Nieuwe klant</button>`;
  }

  let tijden;
  if (!isOpen(d)) tijden = `<div class="hint">Op ${DAGEN[d.getDay()]} is de salon gesloten.</div>`;
  else if (geslotenOp(d)) tijden = `<div class="hint">Gesloten: ${esc(geslotenOp(d).omschrijving || 'sluitingsdag')}.</div>`;
  else if (!duur) tijden = '<div class="hint">Kies eerst een of meer behandelingen.</div>';
  else if (!F.dag) tijden = '<div class="hint">Vrije tijden laden…</div>';
  else if (!vrij.length) tijden = '<div class="hint">Geen ruimte meer op deze dag.</div>';
  else tijden = `<div class="chips grid4">${vrij.map((i) => `<button class="chip ${F.slot === i ? 'on' : ''}" data-action="kiestijd" data-slot="${i}">${fmtMin(C.DAG_START + i * C.BLOK)}</button>`).join('')}</div>`;

  const medNaam = medById(F.med)?.naam || '';
  const klaar = (F.klant || (F.nieuweKlant && F.kNaam.trim())) && F.med && duur && F.slot !== null && F.door && !F.bezig;
  const tijdTekst = F.slot !== null ? ` · ${fmtMin(C.DAG_START + F.slot * C.BLOK)} – ${fmtMin(C.DAG_START + F.slot * C.BLOK + duur)}` : '';

  const body = `
    <div class="field"><span class="lbl">Klant</span>${klant}</div>
    <div class="field"><span class="lbl">Medewerker</span>
      <div class="chips grid3">${meds.map((m) => `<button class="chip ${F.med === m.id ? 'on' : ''}" data-action="kiesmed" data-id="${m.id}"><span class="dot" style="background:${m.kleur}"></span>${esc(m.naam)}</button>`).join('')}</div></div>
    <div class="field"><span class="lbl">Behandelingen · meerdere mogelijk</span>
      <div class="chips">${S.beh.filter((b) => b.actief).map((b) => `<button class="chip ${F.beh.includes(b.id) ? 'on' : ''}" data-action="kiesbeh" data-id="${b.id}">${F.beh.includes(b.id) ? ICON.check : ''}${esc(b.naam)} · ${b.duur_min}</button>`).join('')}</div>
      ${duur ? `<div class="summary"><span>Totale duur</span><b>${duur} min · ${duur / C.BLOK} blokken</b></div>` : ''}</div>
    <div class="field"><label for="datum">Datum</label>
      <input class="input" type="date" id="datum" data-bind="date" data-reload="1" value="${F.date}"></div>
    <div class="field"><span class="lbl">Vrije tijden bij ${esc(medNaam)} · ${fmtDate(d)} · week ${isoWeek(d)}</span>${tijden}</div>
    <div class="field"><span class="lbl">Ingepland door</span>
      <div class="chips grid3">${meds.map((m) => `<button class="chip ${F.door === m.id ? 'on' : ''}" data-action="kiesdoor" data-id="${m.id}">${esc(m.naam)}</button>`).join('')}</div></div>
    <div class="field"><label for="notitie">Notitie (optioneel)</label>
      <textarea class="input" id="notitie" data-bind="notitie">${esc(F.notitie)}</textarea></div>`;
  const footer = `<button class="primary" data-action="opslaan" ${klaar ? '' : 'disabled'}>${F.bezig ? 'Opslaan…' : 'Opslaan' + tijdTekst}</button>`;
  return { titel: F.editId ? 'Afspraak verplaatsen' : 'Nieuwe afspraak', body, footer };
}

async function zoekKlantenSheet() {
  const F = S.sheet;
  if (!F || F.type !== 'nieuw') return;
  const zoek = F.kq.trim().replace(/[,()%*]/g, ' ').trim();
  if (zoek.length < 2) { F.results = []; }
  else {
    const { data, error } = await sb.from('klanten').select('*')
      .or(`naam.ilike.%${zoek}%,telefoon.ilike.%${zoek}%`).order('naam').limit(8);
    if (error) { toast(foutmelding(error)); return; }
    F.results = data;
  }
  const box = document.getElementById('kresults');
  if (box && S.sheet === F) box.innerHTML = klantResultaten(F);
}

async function opslaanAfspraak() {
  const F = S.sheet;
  F.bezig = true; renderSheet();
  eigenWijziging = Date.now(); // vóór het opslaan: de melding van de database kan eerder binnenkomen dan het antwoord
  try {
    if (!F.klant && F.nieuweKlant) {
      const { data, error } = await sb.from('klanten').insert({ naam: F.kNaam.trim(), telefoon: F.kTel.trim() || null }).select().single();
      if (error) throw error;
      F.klant = data; F.nieuweKlant = false;
    }
    const d = fromKey(F.date);
    const start = atMin(d, C.DAG_START + F.slot * C.BLOK);
    const eind = new Date(start.getTime() + duurVan(F) * 60000);
    const rij = {
      klant_id: F.klant.id,
      medewerker_id: F.med,
      start_tijd: start.toISOString(),
      eind_tijd: eind.toISOString(),
      notitie: F.notitie.trim() || null,
      ingepland_door: F.door,
    };
    let afspraakId = F.editId;
    if (F.editId) {
      const { error } = await sb.from('afspraken').update(rij).eq('id', F.editId);
      if (error) throw error;
      const { error: eDel } = await sb.from('afspraak_behandelingen').delete().eq('afspraak_id', F.editId);
      if (eDel) throw eDel;
    } else {
      const { data, error } = await sb.from('afspraken').insert(rij).select('id').single();
      if (error) throw error;
      afspraakId = data.id;
    }
    const { error: e2 } = await sb.from('afspraak_behandelingen').insert(F.beh.map((id) => ({ afspraak_id: afspraakId, behandeling_id: id })));
    if (e2) throw e2;
    localStorage.setItem('ingepland_door', String(F.door));
    eigenWijziging = Date.now();
    speel('ok');
    const wasEdit = !!F.editId;
    closeSheet();
    if (S.view !== 'week') S.view = 'dag';
    S.date = d;
    await refresh();
    toast(`${wasEdit ? 'Afspraak verplaatst naar' : 'Afspraak opgeslagen:'} ${fmtDate(d)} ${fmtTime(start)}`);
  } catch (e) {
    F.bezig = false;
    speel('fout');
    toast(foutmelding(e));
    if (e.code === '23P01') { F.slot = null; await laadVrij(); } else renderSheet();
  }
}

// ---------- Afspraak bekijken ----------
function apptSheet(F) {
  const a = F.a;
  const s = new Date(a.start_tijd), e = new Date(a.eind_tijd);
  const m = medById(a.medewerker_id);
  const door = medById(a.ingepland_door);
  const tel = a.klant?.telefoon;
  const body = `<dl class="kv">
      <dt>Klant</dt><dd>${esc(a.klant?.naam || '—')}</dd>
      ${tel ? `<dt>Telefoon</dt><dd><a href="tel:${esc(tel.replace(/\s/g, ''))}">${esc(tel)}</a></dd>` : ''}
      <dt>Wanneer</dt><dd>${cap(DAGEN[s.getDay()])} ${s.getDate()} ${MAAND[s.getMonth()]} · ${fmtTime(s)} – ${fmtTime(e)}</dd>
      <dt>Medewerker</dt><dd><span class="dot" style="display:inline-block;background:${m?.kleur}"></span> ${esc(m?.naam || '?')}</dd>
      <dt>Behandeling</dt><dd>${esc(behNamen(a) || '—')}</dd>
      ${a.notitie ? `<dt>Notitie</dt><dd>${esc(a.notitie)}</dd>` : ''}
      <dt>Ingepland door</dt><dd>${esc(door?.naam || '—')}</dd>
    </dl>
    ${a.klant ? `<button class="secondary" data-action="klant" data-id="${a.klant.id}">Klantkaart openen</button>` : ''}`;
  const footer = `<button class="primary" data-action="verplaats">Verplaatsen / wijzigen</button>
    <button class="secondary danger" data-action="annuleer">Afspraak annuleren</button>`;
  return { titel: 'Afspraak', body, footer };
}

// ---------- Klant ----------
async function openKlant(id) {
  let k = { naam: '', telefoon: '', email: '', notities: '' };
  if (id) {
    const { data, error } = await sb.from('klanten').select('*').eq('id', id).single();
    if (error) { toast(foutmelding(error)); return; }
    k = data;
  }
  S.sheet = { type: 'klant', k, historie: null };
  renderSheet();
  if (id) {
    const { data, error } = await sb.from('afspraken')
      .select('*, afspraak_behandelingen(behandeling:behandelingen(id,naam))')
      .eq('klant_id', id).eq('geannuleerd', false).order('start_tijd', { ascending: false }).limit(20);
    if (!error && S.sheet?.k === k) { S.sheet.historie = data; renderSheet(); }
  }
}

function klantSheet(F) {
  const k = F.k;
  let hist = '';
  if (k.id) {
    hist = !F.historie ? '<div class="hint">Afspraken laden…</div>'
      : !F.historie.length ? '<div class="hint">Nog geen afspraken.</div>'
      : `<div class="list">${F.historie.map((a) => {
          const s = new Date(a.start_tijd);
          return `<div class="row" style="cursor:default"><span>${fmtDate(s)} ${s.getFullYear()} · ${fmtTime(s)}<br><span class="sub">${esc(behNamen(a))} · ${esc(medById(a.medewerker_id)?.naam || '')}</span></span></div>`;
        }).join('')}</div>`;
  }
  const body = `
    <div class="field"><label for="kn">Naam</label><input class="input" id="kn" data-bind="k.naam" value="${esc(k.naam)}"></div>
    <div class="field"><label for="kt">Telefoon</label><input class="input" id="kt" data-bind="k.telefoon" inputmode="tel" value="${esc(k.telefoon || '')}"></div>
    <div class="field"><label for="ke">E-mail</label><input class="input" id="ke" data-bind="k.email" type="email" value="${esc(k.email || '')}"></div>
    <div class="field"><label for="kno">Notities</label><textarea class="input" id="kno" data-bind="k.notities">${esc(k.notities || '')}</textarea></div>
    ${k.id ? `<div class="field"><span class="lbl">Afspraken (nieuwste eerst)</span>${hist}</div>` : ''}`;
  return { titel: k.id ? 'Klant' : 'Nieuwe klant', body, footer: `<button class="primary" data-action="bewaarklant">Opslaan</button>` };
}

async function bewaarKlant() {
  const k = S.sheet.k;
  if (!k.naam?.trim()) { toast('Vul een naam in'); return; }
  const rij = { naam: k.naam.trim(), telefoon: k.telefoon?.trim() || null, email: k.email?.trim() || null, notities: k.notities?.trim() || null };
  const { error } = k.id ? await sb.from('klanten').update(rij).eq('id', k.id) : await sb.from('klanten').insert(rij);
  if (error) { toast(foutmelding(error)); return; }
  closeSheet();
  toast('Klant opgeslagen');
  await refresh();
}

// ---------- Behandeling ----------
function behSheet(F) {
  const b = F.b;
  let opties = '';
  for (let m = 15; m <= 240; m += 15) opties += `<option value="${m}" ${b.duur_min === m ? 'selected' : ''}>${m} min</option>`;
  const body = `
    <div class="field"><label for="bn">Naam</label><input class="input" id="bn" data-bind="b.naam" value="${esc(b.naam)}"></div>
    <div class="field"><label for="bd">Duur</label><select class="input" id="bd" data-bind="b.duur_min" data-num="1">${opties}</select></div>
    <div class="field"><label for="bv">Volgorde in de lijst</label><input class="input" id="bv" type="number" data-bind="b.volgorde" data-num="1" value="${b.volgorde}"></div>
    <label class="check"><input type="checkbox" data-bind="b.actief" ${b.actief ? 'checked' : ''}> Actief (zichtbaar bij nieuwe afspraak)</label>
    <div class="hint">Een behandeling die je uitzet, verdwijnt uit de keuzelijst. Bestaande afspraken blijven kloppen.</div>`;
  return { titel: b.id ? 'Behandeling' : 'Nieuwe behandeling', body, footer: `<button class="primary" data-action="bewaarbeh">Opslaan</button>` };
}

async function bewaarBeh() {
  const b = S.sheet.b;
  if (!b.naam?.trim()) { toast('Vul een naam in'); return; }
  const rij = { naam: b.naam.trim(), duur_min: b.duur_min, volgorde: b.volgorde || 0, actief: b.actief };
  const { error } = b.id ? await sb.from('behandelingen').update(rij).eq('id', b.id) : await sb.from('behandelingen').insert(rij);
  if (error) { toast(foutmelding(error)); return; }
  closeSheet();
  toast('Behandeling opgeslagen');
  await loadBase();
  await refresh();
}

// ---------- Afwezigheid ----------
function afwSheet(F) {
  const a = F.a;
  const meds = actieveMeds();
  const body = `
    <div class="field"><span class="lbl">Medewerker</span>
      <div class="chips grid3">${meds.map((m) => `<button class="chip ${a.med === m.id ? 'on' : ''}" data-action="afwmed" data-id="${m.id}"><span class="dot" style="background:${m.kleur}"></span>${esc(m.naam)}</button>`).join('')}</div></div>
    <div class="two">
      <div class="field"><label for="av">Van datum</label><input class="input" type="date" id="av" data-bind="a.van" value="${a.van}"></div>
      <div class="field"><label for="avt">Vanaf</label><select class="input" id="avt" data-bind="a.tijdVan" data-num="1">${tijdOpties(a.tijdVan, C.DAG_START, C.DAG_EIND - C.BLOK)}</select></div>
    </div>
    <div class="two">
      <div class="field"><label for="at">Tot en met datum</label><input class="input" type="date" id="at" data-bind="a.tot" value="${a.tot}"></div>
      <div class="field"><label for="att">Tot</label><select class="input" id="att" data-bind="a.tijdTot" data-num="1">${tijdOpties(a.tijdTot, C.DAG_START + C.BLOK, C.DAG_EIND)}</select></div>
    </div>
    <div class="field"><label for="ar">Reden (optioneel)</label><input class="input" id="ar" data-bind="a.reden" placeholder="Vakantie, vrije dag, pauze…" value="${esc(a.reden)}"></div>
    <div class="hint">Bestaande afspraken in deze periode blijven staan; controleer die zelf even.</div>`;
  return { titel: 'Afwezigheid', body, footer: `<button class="primary" data-action="bewaarafw">Opslaan</button>` };
}

async function bewaarAfw() {
  const a = S.sheet.a;
  if (!a.med || !a.van || !a.tot) { toast('Vul medewerker en datums in'); return; }
  const s = atMin(fromKey(a.van), a.tijdVan), e = atMin(fromKey(a.tot), a.tijdTot);
  if (e <= s) { toast('Het einde moet na het begin liggen'); return; }
  const { error } = await sb.from('afwezigheid').insert({ medewerker_id: a.med, start_tijd: s.toISOString(), eind_tijd: e.toISOString(), reden: a.reden.trim() || null });
  if (error) { toast(foutmelding(error)); return; }
  closeSheet();
  toast('Afwezigheid opgeslagen');
  await refresh();
}

// ---------- Naar een andere datum ----------
async function naarDatum(anim = null) {
  S.appts = []; S.afw = [];          // geen afspraken van de vorige dag tonen
  S.anim = anim;
  render();
  await refresh();
}

// Eén dag (of week) vooruit/achteruit; anim = veeg-animatie
async function verschuif(dir, anim = null) {
  S.date = S.view === 'week' ? addDays(S.date, 7 * dir) : nextOpen(addDays(S.date, dir), dir);
  await naarDatum(anim);
}

// Vegen naar links/rechts in de agenda
let veeg = null;
document.addEventListener('touchstart', (e) => {
  veeg = null;
  if (S.sheet || !S.session || !(S.view === 'dag' || S.view === 'week')) return;
  if (!e.target.closest('main') || e.touches.length !== 1) return;
  const t = e.touches[0];
  veeg = { x: t.clientX, y: t.clientY, t: Date.now() };
}, { passive: true });
document.addEventListener('touchend', (e) => {
  if (!veeg) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - veeg.x, dy = t.clientY - veeg.y, dt = Date.now() - veeg.t;
  veeg = null;
  if (Math.abs(dx) > 60 && Math.abs(dx) > 1.5 * Math.abs(dy) && dt < 700) {
    verschuif(dx < 0 ? 1 : -1, dx < 0 ? 'links' : 'rechts');
  }
}, { passive: true });

// ---------- Maandkalender ----------
function openKalender() {
  S.sheet = { type: 'kal', jaar: S.date.getFullYear(), maand: S.date.getMonth(), bezetting: null };
  laadBezetting();
}

function kalBereik(F) {
  const eerste = new Date(F.jaar, F.maand, 1);
  const laatste = new Date(F.jaar, F.maand + 1, 0);
  return { van: monday(eerste), tot: addDays(monday(laatste), 7) };
}

async function laadBezetting() {
  const F = S.sheet;
  F.bezetting = null;
  renderSheet();
  const { van, tot } = kalBereik(F);
  const { data, error } = await sb.from('afspraken').select('start_tijd,eind_tijd')
    .eq('geannuleerd', false).gte('start_tijd', van.toISOString()).lt('start_tijd', tot.toISOString());
  if (S.sheet !== F) return;
  if (error) { toast(foutmelding(error)); return; }
  const min = {};
  for (const a of data) {
    const k = key(new Date(a.start_tijd));
    min[k] = (min[k] || 0) + (new Date(a.eind_tijd) - new Date(a.start_tijd)) / 60000;
  }
  F.bezetting = min;
  renderSheet();
}

function kalSheet(F) {
  const { van, tot } = kalBereik(F);
  const capaciteit = Math.max(1, actieveMeds().length) * (C.DAG_EIND - C.DAG_START);
  const vandaagK = key(today());
  const gekozenK = key(S.date);
  let rijen = '';
  for (let ma = van; ma < tot; ma = addDays(ma, 7)) {
    rijen += `<button class="kwk" data-action="kalweek" data-date="${key(ma)}" aria-label="Week ${isoWeek(ma)}">${isoWeek(ma)}</button>`;
    for (let i = 0; i < 7; i++) {
      const d = addDays(ma, i);
      const k = key(d);
      const dicht = !isOpen(d) || geslotenOp(d);
      const cls = ['kdag', d.getMonth() !== F.maand ? 'buiten' : '', dicht ? 'dicht' : '', k === vandaagK ? 'vandaag' : '', k === gekozenK ? 'gekozen' : ''].join(' ');
      const pct = !dicht && F.bezetting ? Math.min(100, Math.round(((F.bezetting[k] || 0) / capaciteit) * 100)) : 0;
      const label = `${DAGEN[d.getDay()]} ${d.getDate()} ${MAANDLANG[d.getMonth()]}${geslotenOp(d) ? ', gesloten' : ''}${pct ? `, ${pct}% bezet` : ''}`;
      rijen += `<button class="${cls}" data-action="kaldag" data-date="${k}" aria-label="${esc(label)}">
        <span>${d.getDate()}</span>${!dicht ? `<span class="kbar"><span style="width:${pct}%"></span></span>` : ''}</button>`;
    }
  }
  const body = `
    <div class="kalnav">
      <button class="iconbtn" data-action="kalprev" aria-label="Vorige maand">${ICON.left}</button>
      <span class="kaltitel">${cap(MAANDLANG[F.maand])} ${F.jaar}</span>
      <button class="iconbtn" data-action="kalnext" aria-label="Volgende maand">${ICON.right}</button>
    </div>
    <div class="kal">
      <span class="kh">wk</span>${['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'].map((x) => `<span class="kh">${x}</span>`).join('')}
      ${rijen}
    </div>
    <div class="hint">Tik op een dag voor het dagoverzicht, of op een weeknummer voor het weekoverzicht.
      Het balkje laat zien hoe vol een dag is${F.bezetting ? '' : ' (laden…)'}. Grijs = gesloten.</div>`;
  return { titel: 'Kies een datum', body, footer: `<button class="secondary" data-action="kalvandaag">Vandaag</button>` };
}

// ---------- Sluitingsdag ----------
function sluitSheet(F) {
  const z = F.z;
  const body = `
    <div class="field"><label for="zo">Omschrijving</label><input class="input" id="zo" data-bind="z.omschrijving" placeholder="Bijv. salonvakantie" value="${esc(z.omschrijving)}"></div>
    <div class="two">
      <div class="field"><label for="zv">Van</label><input class="input" type="date" id="zv" data-bind="z.van" value="${z.van}"></div>
      <div class="field"><label for="zt">Tot en met</label><input class="input" type="date" id="zt" data-bind="z.tot" value="${z.tot}"></div>
    </div>
    <div class="hint">Op deze dagen kunnen geen afspraken worden gemaakt. Bestaande afspraken blijven staan; de app waarschuwt ervoor.</div>`;
  return { titel: 'Sluitingsdag', body, footer: `<button class="primary" data-action="bewaarsluit">Opslaan</button>` };
}

async function bewaarSluit() {
  const z = S.sheet.z;
  if (!z.van || !z.tot) { toast('Vul de datums in'); return; }
  if (z.tot < z.van) { toast('"Tot en met" moet na "Van" liggen'); return; }
  const { error } = await sb.from('sluitingsdagen').insert({ van: z.van, tot: z.tot, omschrijving: z.omschrijving.trim() || null });
  if (error) { toast(foutmelding(error)); return; }
  closeSheet();
  toast('Sluitingsdag opgeslagen');
  await refresh();
}

async function voegFeestdagenToe(jaar) {
  const bestaand = new Set(S.sluit.map((z) => z.van));
  const nieuw = feestdagen(jaar).filter((f) => !bestaand.has(f.datum) && f.datum >= key(today()));
  if (!nieuw.length) { toast(`Feestdagen ${jaar} staan er al in`); return; }
  const { error } = await sb.from('sluitingsdagen').insert(nieuw.map((f) => ({ van: f.datum, tot: f.datum, omschrijving: f.naam })));
  if (error) { toast(foutmelding(error)); return; }
  toast(`${nieuw.length} feestdagen toegevoegd. Zet zelf op "Toch open" waar de salon open is.`);
  await refresh();
}

// ===================================================================
// Acties
// ===================================================================
const acties = {
  async view(el) {
    S.view = el.dataset.v;
    if (S.view === 'dag' && !isOpen(S.date)) S.date = nextOpen(S.date);
    await naarDatum();
  },
  prev() { verschuif(-1); },
  next() { verschuif(1); },
  async vandaag() { S.date = S.view === 'week' ? today() : nextOpen(today()); await naarDatum(); },
  async goday(el) { S.date = fromKey(el.dataset.date); S.view = 'dag'; await naarDatum(); },

  // kalender
  kalender() { openKalender(); },
  kalprev() { const F = S.sheet; F.maand--; if (F.maand < 0) { F.maand = 11; F.jaar--; } laadBezetting(); },
  kalnext() { const F = S.sheet; F.maand++; if (F.maand > 11) { F.maand = 0; F.jaar++; } laadBezetting(); },
  async kaldag(el) { closeSheet(); S.date = fromKey(el.dataset.date); S.view = 'dag'; await naarDatum(); },
  async kalweek(el) { closeSheet(); S.date = fromKey(el.dataset.date); S.view = 'week'; await naarDatum(); },
  async kalvandaag() { closeSheet(); S.date = nextOpen(today()); S.view = 'dag'; await naarDatum(); },
  nieuw() { openNieuw(); },
  slot(el, ev) {
    const r = el.getBoundingClientRect();
    const slot = Math.floor((ev.clientY - r.top) / cssVarPx('--slot'));
    if (slot < 0 || slot >= NSLOTS) return;
    openNieuw({ med: Number(el.dataset.med), date: key(S.date), slot });
  },
  appt(el) {
    const a = S.appts.find((x) => x.id === Number(el.dataset.id));
    if (!a) return;
    S.sheet = { type: 'appt', a };
    renderSheet();
  },
  verplaats() { openNieuw({ edit: S.sheet.a }); },
  async annuleer() {
    const a = S.sheet.a;
    if (!confirm(`Afspraak van ${a.klant?.naam || 'deze klant'} annuleren?`)) return;
    eigenWijziging = Date.now();
    const { error } = await sb.from('afspraken').update({ geannuleerd: true }).eq('id', a.id);
    if (error) { speel('fout'); toast(foutmelding(error)); return; }
    speel('ok');
    closeSheet();
    toast('Afspraak geannuleerd');
    await refresh();
  },
  sluit() { closeSheet(); },
  sluitbuiten(el, ev) { if (ev.target === el) closeSheet(); },

  // nieuwe afspraak
  kiesmed(el) { S.sheet.med = Number(el.dataset.id); S.sheet.slot = null; renderSheet(); },
  kiesbeh(el) {
    const id = Number(el.dataset.id), F = S.sheet;
    F.beh = F.beh.includes(id) ? F.beh.filter((x) => x !== id) : [...F.beh, id];
    renderSheet();
  },
  kiestijd(el) { S.sheet.slot = Number(el.dataset.slot); renderSheet(); },
  kiesdoor(el) { S.sheet.door = Number(el.dataset.id); renderSheet(); },
  kiesklant(el) {
    const F = S.sheet;
    F.klant = F.results.find((k) => k.id === Number(el.dataset.id));
    renderSheet();
  },
  wisklant() { Object.assign(S.sheet, { klant: null, kq: '', results: [] }); renderSheet(); },
  nieuweklantinline() {
    const F = S.sheet;
    F.nieuweKlant = true;
    if (F.kq && !/^\+?[\d\s-]+$/.test(F.kq)) F.kNaam = F.kq;
    else if (F.kq) F.kTel = F.kq;
    renderSheet();
  },
  zoekklant() { S.sheet.nieuweKlant = false; renderSheet(); },
  opslaan() { opslaanAfspraak(); },

  // klanten
  klant(el) { openKlant(Number(el.dataset.id)); },
  nieuweklant() { openKlant(null); },
  bewaarklant() { bewaarKlant(); },

  // instellingen
  beh(el) {
    const b = S.beh.find((x) => x.id === Number(el.dataset.id));
    S.sheet = { type: 'beh', b: { ...b } };
    renderSheet();
  },
  nieuwebeh() {
    const max = S.beh.reduce((m, b) => Math.max(m, b.volgorde || 0), 0);
    S.sheet = { type: 'beh', b: { naam: '', duur_min: 30, volgorde: max + 1, actief: true } };
    renderSheet();
  },
  bewaarbeh() { bewaarBeh(); },
  nieuweafw() {
    const d = key(nextOpen(today()));
    S.sheet = { type: 'afw', a: { med: actieveMeds()[0]?.id, van: d, tot: d, tijdVan: C.DAG_START, tijdTot: C.DAG_EIND, reden: '' } };
    renderSheet();
  },
  afwmed(el) { S.sheet.a.med = Number(el.dataset.id); renderSheet(); },
  feestdagen(el) { voegFeestdagenToe(Number(el.dataset.jaar)); },
  nieuwesluit() {
    const d = key(nextOpen(today()));
    S.sheet = { type: 'sluit', z: { omschrijving: '', van: d, tot: d } };
    renderSheet();
  },
  bewaarsluit() { bewaarSluit(); },
  async sluittoggle(el) {
    const z = S.sluit.find((x) => x.id === Number(el.dataset.id));
    if (!z) return;
    const { error } = await sb.from('sluitingsdagen').update({ gesloten: !z.gesloten }).eq('id', z.id);
    if (error) { toast(foutmelding(error)); return; }
    await refresh();
  },
  async sluitdel(el) {
    if (!confirm('Deze sluitingsdag verwijderen?')) return;
    const { error } = await sb.from('sluitingsdagen').delete().eq('id', Number(el.dataset.id));
    if (error) { toast(foutmelding(error)); return; }
    await refresh();
  },
  bewaarafw() { bewaarAfw(); },
  async delafw(el) {
    if (!confirm('Deze afwezigheid verwijderen?')) return;
    const { error } = await sb.from('afwezigheid').delete().eq('id', Number(el.dataset.id));
    if (error) { toast(foutmelding(error)); return; }
    await refresh();
  },
  testgeluid() {
    speel('ok', true);
    setTimeout(() => speel('fout', true), 600);
    setTimeout(() => speel('nieuw', true), 1300);
    if (!geluidAan()) toast('Geluiden staan nog uit op dit apparaat');
  },
  async logout() {
    if (!confirm('Uitloggen op dit apparaat?')) return;
    await sb.auth.signOut();
  },
};

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-action]');
  if (!el) return;
  const f = acties[el.dataset.action];
  if (f) f(el, ev);
});

// Invoervelden koppelen aan de toestand van de pop-up
function setPath(obj, path, val) {
  const delen = path.split('.');
  let o = obj;
  for (let i = 0; i < delen.length - 1; i++) o = o[delen[i]];
  o[delen[delen.length - 1]] = val;
}

let zoekTimer;
document.addEventListener('input', (ev) => {
  const el = ev.target;
  if (el.dataset.zoek === 'lijst') {
    S.kq = el.value;
    clearTimeout(zoekTimer);
    zoekTimer = setTimeout(async () => {
      try { await loadKlanten(); const l = document.getElementById('klijst'); if (l) l.innerHTML = klantRijen(); }
      catch (e) { toast(foutmelding(e)); }
    }, 250);
    return;
  }
  if (el.dataset.zoek === 'sheet' && S.sheet) {
    S.sheet.kq = el.value;
    clearTimeout(zoekTimer);
    zoekTimer = setTimeout(zoekKlantenSheet, 250);
    return;
  }
  if (el.dataset.bind && S.sheet && el.type !== 'checkbox' && el.tagName !== 'SELECT' && el.type !== 'date') {
    setPath(S.sheet, el.dataset.bind, el.dataset.num ? Number(el.value) : el.value);
    if (S.sheet.type === 'nieuw' && el.dataset.bind === 'kNaam') {
      const btn = sheetEl.querySelector('[data-action="opslaan"]');
      const F = S.sheet;
      if (btn) btn.disabled = !((F.klant || F.kNaam.trim()) && F.med && duurVan(F) && F.slot !== null && F.door);
    }
  }
});

document.addEventListener('change', (ev) => {
  const el = ev.target;
  if (el.dataset.pref === 'geluid') {
    try { localStorage.setItem('geluid', el.checked ? '1' : '0'); } catch { /* geen opslag */ }
    if (el.checked) speel('ok');
    return;
  }
  if (!el.dataset.bind || !S.sheet) return;
  let val = el.type === 'checkbox' ? el.checked : el.value;
  if (el.dataset.num) val = Number(val);
  setPath(S.sheet, el.dataset.bind, val);
  if (el.dataset.reload && S.sheet.type === 'nieuw') { S.sheet.slot = null; laadVrij(); }
});

document.addEventListener('submit', async (ev) => {
  const f = ev.target;
  if (f.dataset.form !== 'login') return;
  ev.preventDefault();
  const btn = f.querySelector('button');
  btn.disabled = true; btn.textContent = 'Bezig…';
  const { error } = await sb.auth.signInWithPassword({ email: f.email.value.trim(), password: f.password.value });
  if (error) {
    const m = (error.message || '').toLowerCase();
    let tekst = 'Inloggen mislukt: ' + error.message;
    if (m.includes('invalid login')) tekst = 'E-mailadres of wachtwoord klopt niet.';
    else if (m.includes('not confirmed')) tekst = 'Dit account is nog niet bevestigd in Supabase.';
    else if (m.includes('banned')) tekst = 'Dit account is geblokkeerd.';
    app.innerHTML = loginHtml(tekst);
    return;
  }
});

document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape' && S.sheet) closeSheet();
});

// ===================================================================
// Opstarten
// ===================================================================
let kanaal = null;
async function start() {
  try {
    await loadBase();
    await loadRange();
  } catch (e) { toast(foutmelding(e)); }
  render();
  if (!kanaal) {
    kanaal = sb.channel('salon')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'afspraken' }, (p) => {
        // belletje bij een nieuwe afspraak die een collega (ander apparaat) maakte
        if (p?.eventType === 'INSERT' && Date.now() - eigenWijziging > 5000) speel('nieuw');
        refresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'afwezigheid' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sluitingsdagen' }, () => refresh())
      .subscribe();
  }
}

sb.auth.onAuthStateChange((event, session) => {
  const wasIn = !!S.session;
  S.session = session;
  if (session && !wasIn) setTimeout(start, 0);
  if (!session) {
    if (kanaal) { sb.removeChannel(kanaal); kanaal = null; }
    closeSheet();
    render();
  }
});

// Elke minuut de "nu"-lijn bijwerken; bij terugkeren naar de app verversen
setInterval(() => { if (S.session && S.view === 'dag' && !S.sheet) render(); }, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden && S.session) refresh(); });

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

(async () => {
  const { data } = await sb.auth.getSession();
  if (!data.session) { S.session = null; render(); }
})();
