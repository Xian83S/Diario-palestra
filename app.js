'use strict';

/* =========================================================================
   Diario Palestra — logica dell'interfaccia.
   I dati passano SOLO da Store (storage.js).
   ========================================================================= */

/* ---------- Utilità ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const norm = s => String(s ?? '').trim().toLowerCase();
const pad = n => String(n).padStart(2, '0');
const toNum = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : NaN; };
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const fmt = (n, dec = 1) => Number.isFinite(n) ? n.toLocaleString('it-IT', { maximumFractionDigits: dec }) : '–';
const fmtKgInput = n => Number.isFinite(n) && n > 0 ? String(n).replace('.', ',') : (n === 0 ? '0' : '');
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const timeOf = v => new Date(v || 0).getTime() || 0;

function parseDate(s) {
  const [y, m, d] = String(s).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
function fmtDate(s, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  return parseDate(s).toLocaleDateString('it-IT', opts);
}
function fmtDateRel(s) {
  if (s === todayStr()) return 'oggi';
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (s === `${y.getFullYear()}-${pad(y.getMonth() + 1)}-${pad(y.getDate())}`) return 'ieri';
  const sameYear = parseDate(s).getFullYear() === new Date().getFullYear();
  return fmtDate(s, sameYear ? { day: 'numeric', month: 'short' } : undefined);
}

/* ---------- Regole di calcolo ---------- */
const epley = (kg, reps) => reps <= 1 ? kg : kg * (1 + reps / 30);
const setsVolume = sets => sets.reduce((sum, s) => sum + s.kg * s.reps, 0);
const sessionVolume = session => session.exercises.reduce((sum, ex) => sum + setsVolume(ex.sets), 0);
const sessionSetCount = session => session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
const setsText = sets => sets.map(s => `${fmt(s.kg, 2)}×${s.reps}`).join(' · ');
const fmtDur = sec => { sec = Math.max(0, Math.ceil(sec)); return `${Math.floor(sec / 60)}:${pad(sec % 60)}`; };
const restOf = ex => Model.cleanRest(ex && ex.rest);

const ICON = {
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  chev: '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
  timer: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 1.5M9.5 2.5h5"/></svg>',
};

/* ---------- Stato ---------- */
const state = {
  view: 'oggi',
  plans: [],
  sessions: [],
  draft: null,
  summary: null,     // riepilogo dopo "Termina allenamento"
  editor: null,      // scheda in modifica
  progress: { exercise: '', metric: 'max' },
  openSessions: new Set(),
  confirm: null,     // chiave del pulsante "armato" (eliminazione a due passaggi)
  lastBackup: null,
};

/* ---------- Esempi ---------- */
// Ogni serie è [ripetizioni, kg]; same() crea serie identiche.
const same = (n, reps, kg) => Array.from({ length: n }, () => [reps, kg]);
const EXAMPLE_PLANS = [
  { name: 'Push', exercises: [
    ['Panca piana', [[10, 55], [8, 60], [8, 60], [6, 65]]], ['Spinte manubri panca inclinata', same(3, 10, 22)],
    ['Lento avanti manubri', [[10, 14], [10, 16], [8, 16]]], ['Alzate laterali', same(3, 12, 8)], ['Push down ai cavi', same(3, 12, 25)],
  ] },
  { name: 'Pull', exercises: [
    ['Trazioni', same(4, 6, 0)], ['Rematore bilanciere', [[10, 45], [8, 50], [8, 50], [6, 55]]], ['Lat machine', same(3, 10, 45)],
    ['Face pull', same(3, 15, 15)], ['Curl bilanciere', same(3, 10, 25)],
  ] },
  { name: 'Gambe', exercises: [
    ['Squat', [[8, 70], [6, 80], [6, 80], [5, 85]]], ['Stacco rumeno', same(3, 8, 70)], ['Pressa', same(3, 10, 120)],
    ['Leg curl', same(3, 12, 35)], ['Calf raise', same(4, 12, 40)], ['Plank', same(3, 1, 0), { timer: 45 }],
  ] },
];

/* ---------- Interrogazioni sullo storico ---------- */
function sortedSessions() {
  return [...state.sessions].sort((a, b) => b.date.localeCompare(a.date) || timeOf(b.createdAt) - timeOf(a.createdAt));
}

/** Ultima esecuzione di un esercizio (per nome, ignorando maiuscole e spazi). */
function lastPerformance(name) {
  const key = norm(name);
  for (const s of sortedSessions()) {
    const ex = s.exercises.find(e => norm(e.name) === key && e.sets.length);
    if (ex) return { date: s.date, sets: ex.sets };
  }
  return null;
}

/** Peso massimo mai sollevato in un esercizio (null se mai fatto). */
function previousMax(name) {
  const key = norm(name);
  let max = null;
  for (const s of state.sessions) for (const ex of s.exercises) {
    if (norm(ex.name) !== key) continue;
    for (const set of ex.sets) if (max === null || set.kg > max) max = set.kg;
  }
  return max;
}

/** Storico di un esercizio in ordine cronologico, con le metriche per sessione. */
function exerciseHistory(name) {
  const key = norm(name);
  const out = [];
  for (const s of [...sortedSessions()].reverse()) {
    const sets = s.exercises.filter(e => norm(e.name) === key).flatMap(e => e.sets);
    if (!sets.length) continue;
    out.push({
      date: s.date, planName: s.planName, sets,
      max: Math.max(...sets.map(x => x.kg)),
      orm: Math.max(...sets.map(x => epley(x.kg, x.reps))),
      volume: setsVolume(sets),
    });
  }
  return out;
}

/** Nomi di esercizi conosciuti (storico prima, poi schede), senza doppioni. */
function knownExerciseNames({ withHistoryOnly = false } = {}) {
  const seen = new Map();
  for (const s of sortedSessions()) for (const ex of s.exercises) {
    if (ex.sets.length && !seen.has(norm(ex.name))) seen.set(norm(ex.name), ex.name.trim());
  }
  if (!withHistoryOnly) for (const p of state.plans) for (const ex of p.exercises) {
    if (!seen.has(norm(ex.name))) seen.set(norm(ex.name), ex.name.trim());
  }
  return [...seen.values()];
}

/* ---------- Avvisi e conferme ---------- */
let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3200);
}

let armTimer;
/** Eliminazione a due passaggi: il primo tocco "arma" il pulsante, il secondo conferma. */
function confirmTwice(key) {
  if (state.confirm === key) {
    state.confirm = null;
    clearTimeout(armTimer);
    return true;
  }
  state.confirm = key;
  clearTimeout(armTimer);
  armTimer = setTimeout(() => { if (state.confirm === key) { state.confirm = null; render(); } }, 4000);
  render();
  return false;
}
const armed = key => state.confirm === key;

async function safely(fn) {
  try { await fn(); } catch (err) { console.error(err); toast(err.message || 'Qualcosa è andato storto.'); }
}

/* =========================================================================
   VISTA: OGGI
   ========================================================================= */
function renderOggi() {
  if (state.summary) return renderSummary();
  if (state.draft) return renderDraft();

  const last = sortedSessions()[0];
  const plans = state.plans.map(p => `
    <button type="button" class="btn" data-action="start" data-plan="${esc(p.id)}">
      <span><strong>${esc(p.name)}</strong><br><span class="meta">${plural(p.exercises.length, 'esercizio', 'esercizi')}</span></span>
      <span class="meta">Inizia →</span>
    </button>`).join('');

  return `
    <header class="view-head">
      <div>
        <h1>Oggi</h1>
        <p class="sub">${esc(fmtDate(todayStr(), { weekday: 'long', day: 'numeric', month: 'long' }))}</p>
      </div>
    </header>
    ${last ? `<p class="muted">Ultimo allenamento: <strong>${esc(last.planName)}</strong>, ${esc(fmtDateRel(last.date))}.</p>` : ''}
    <h2 class="section-title">Scegli la scheda</h2>
    <div class="plan-pick">
      ${plans}
      <button type="button" class="btn ${state.plans.length ? 'soft' : 'primary'}" data-action="start" data-plan="">
        <span><strong>Allenamento libero</strong><br><span class="meta">Aggiungi gli esercizi mentre ti alleni</span></span>
        <span class="meta">Inizia →</span>
      </button>
    </div>
    ${state.plans.length ? '' : `
      <div class="card empty">
        <h2>Nessuna scheda</h2>
        <p>Crea la tua prima scheda o aggiungi gli esempi dalla sezione Schede.</p>
        <div class="row" style="margin-top:14px"><button type="button" class="btn soft" data-action="tab" data-view="schede">Vai a Schede</button></div>
      </div>`}`;
}

function renderDraft() {
  const d = state.draft;
  const total = d.exercises.reduce((n, ex) => n + ex.sets.length, 0);
  const done = d.exercises.reduce((n, ex) => n + ex.sets.filter(s => s.done).length, 0);
  const pending = total - done;

  const exercises = d.exercises.map((ex, i) => {
    const last = lastPerformance(ex.name);
    const rows = ex.sets.map((s, j) => `
      <div class="set-row ${s.done ? 'done' : ''}" data-i="${i}" data-j="${j}">
        <span class="set-n">${j + 1}</span>
        <input type="text" inputmode="decimal" autocomplete="off" enterkeyhint="next" aria-label="Serie ${j + 1}, kg" data-field="kg" value="${esc(s.kg)}" placeholder="kg">
        <input type="text" inputmode="numeric" autocomplete="off" enterkeyhint="done" aria-label="Serie ${j + 1}, ripetizioni" data-field="reps" value="${esc(s.reps)}" placeholder="rip">
        <button type="button" class="check" data-action="set-toggle" aria-pressed="${s.done}" aria-label="Serie ${j + 1} fatta">${ICON.check}</button>
        ${exTimerOn(ex) ? (timerFor(i, j)
          ? `<button type="button" class="set-timer-btn running" data-action="timer-stop">${ICON.timer}<span>Ferma timer</span></button>`
          : `<button type="button" class="set-timer-btn" data-action="set-timer" data-i="${i}" data-j="${j}" aria-label="Avvia timer serie ${j + 1}, ${ex.timer.seconds} secondi">${ICON.timer}<span>Avvia timer <span class="num">${fmtDur(ex.timer.seconds)}</span></span></button>`) : ''}
      </div>`).join('');
    const rmKey = `ex-${i}`;
    return `
      <article class="card">
        <div class="ex-head">
          <h3>${esc(ex.name)}</h3>
          <button type="button" class="icon-btn ${armed(rmKey) ? 'armed' : ''}" data-action="ex-remove" data-i="${i}" aria-label="Rimuovi ${esc(ex.name)}">
            ${armed(rmKey) ? 'Rimuovi?' : ICON.close}
          </button>
        </div>
        <p class="last">${last
          ? `Ultima volta: <strong>${esc(fmtDateRel(last.date))}</strong>, <span class="num">${esc(setsText(last.sets))}</span>`
          : 'Prima volta per questo esercizio'}</p>
        <div class="sets">
          <div class="set-row head" aria-hidden="true"><span>#</span><span style="text-align:center">kg</span><span style="text-align:center">Rip.</span><span>Fatta</span></div>
          ${rows}
        </div>
        <div class="ex-actions">
          <button type="button" class="btn small" data-action="set-remove" data-i="${i}" ${ex.sets.length <= 1 ? 'disabled' : ''}>− Serie</button>
          <button type="button" class="btn small soft" data-action="set-add" data-i="${i}">+ Serie</button>
        </div>
        <button type="button" class="btn small block rest-btn" data-action="rest-start" data-i="${i}">
          ${ICON.timer}<span>Recupero <span class="num">${fmtDur(restOf(ex))}</span></span>
        </button>
      </article>`;
  }).join('');

  return `
    <header class="draft-head">
      <div style="min-width:0">
        <p class="sub muted">Allenamento in corso</p>
        <h1 style="word-break:break-word">${esc(d.planName)}</h1>
      </div>
      <span class="progress-pill" id="progress-pill">${done}/${total} serie</span>
    </header>
    <label class="field date-wrap"><span>Data</span><input type="date" data-field="draft-date" value="${esc(d.date)}" max="${todayStr()}"></label>
    ${exercises || '<div class="card empty"><p>Nessun esercizio. Aggiungine uno qui sotto.</p></div>'}
    <form class="add-ex" data-form="add-ex" autocomplete="off">
      <input name="name" list="exercise-names-oggi" placeholder="Aggiungi esercizio…" aria-label="Nome esercizio da aggiungere" enterkeyhint="done">
      <button type="submit" class="btn soft">Aggiungi</button>
    </form>
    <datalist id="exercise-names-oggi">${knownExerciseNames().map(n => `<option value="${esc(n)}">`).join('')}</datalist>
    <button type="button" class="btn primary big block ${armed('finish') ? 'armed' : ''}" data-action="finish">
      ${armed('finish') ? `Conferma: ${pending} ${pending === 1 ? 'serie non fatta verrà scartata' : 'serie non fatte verranno scartate'}` : 'Termina allenamento'}
    </button>
    <button type="button" class="btn ghost danger block ${armed('discard') ? 'armed' : ''}" data-action="discard">
      ${armed('discard') ? 'Tocca ancora per annullare tutto' : 'Annulla allenamento'}
    </button>`;
}

function renderSummary() {
  const { session, sets, volume, records } = state.summary;
  return `
    <header class="view-head"><div><p class="sub">Allenamento salvato</p><h1>Ben fatto!</h1></div></header>
    <article class="card summary">
      <h2>${esc(session.planName)}</h2>
      <p class="muted" style="margin-bottom:12px">${esc(fmtDate(session.date, { weekday: 'long', day: 'numeric', month: 'long' }))}</p>
      <div class="tiles three">
        <div class="tile"><div class="label">Serie</div><div class="value">${sets}</div></div>
        <div class="tile"><div class="label">Esercizi</div><div class="value">${session.exercises.length}</div></div>
        <div class="tile"><div class="label">Volume</div><div class="value">${fmt(volume, 0)}<small>kg</small></div></div>
      </div>
    </article>
    <h2 class="section-title">Nuovi record di peso</h2>
    ${records.length ? `<div class="records">${records.map(r => `
      <div class="record-item">
        <span class="star" aria-hidden="true">★</span>
        <span><strong>${esc(r.name)}</strong><br><span class="muted">prima: ${fmt(r.prev, 2)} kg</span></span>
        <span class="num">${fmt(r.max, 2)} kg</span>
      </div>`).join('')}</div>`
      : '<p class="muted">Nessun nuovo record questa volta. Si continua!</p>'}
    <button type="button" class="btn primary big block" data-action="summary-close">Chiudi</button>`;
}

/** Serie previste di una scheda -> serie dell'allenamento in corso (stringhe, non fatte). */
function planSetsToDraft(sets) {
  return sets.map(s => ({ kg: fmtKgInput(s.weight), reps: s.reps ? String(s.reps) : '', done: false }));
}

function startWorkout(planId) {
  if (state.draft) return toast('C\'è già un allenamento in corso.');
  const plan = state.plans.find(p => p.id === planId);
  state.draft = {
    id: uid(),
    date: todayStr(),
    planId: plan ? plan.id : null,
    planName: plan ? plan.name : 'Allenamento libero',
    createdAt: new Date().toISOString(),
    exercises: plan ? plan.exercises.map(ex => ({
      name: ex.name,
      rest: restOf(ex),
      timer: Model.cleanTimer(ex.timer),
      sets: planSetsToDraft(ex.sets),
    })) : [],
    timer: null,
  };
  state.summary = null;
  saveDraft();
  showView('oggi');
  window.scrollTo(0, 0);
}

function addDraftExercise(name) {
  name = name.trim();
  if (!name) return;
  const last = lastPerformance(name);
  const fromPlan = state.plans.flatMap(p => p.exercises).find(e => norm(e.name) === norm(name));
  let sets;
  if (last) sets = last.sets.map(s => ({ kg: fmtKgInput(s.kg), reps: String(s.reps), done: false }));
  else if (fromPlan) sets = planSetsToDraft(fromPlan.sets);
  else sets = Array.from({ length: 3 }, () => ({ kg: '', reps: '', done: false }));
  state.draft.exercises.push({ name, rest: restOf(fromPlan), timer: Model.cleanTimer(fromPlan && fromPlan.timer), sets });
  saveDraft();
  render();
}

let draftSaveTimer;
function saveDraft({ immediate = true } = {}) {
  clearTimeout(draftSaveTimer);
  const doSave = () => safely(() => Store.saveDraft(state.draft));
  if (immediate) doSave(); else draftSaveTimer = setTimeout(doSave, 250);
}

async function finishWorkout() {
  const d = state.draft;
  const exercises = d.exercises
    .map(ex => ({
      name: ex.name.trim(),
      sets: ex.sets.filter(s => s.done)
        .map(s => ({ kg: toNum(s.kg), reps: Math.round(toNum(s.reps)) }))
        .filter(s => s.kg >= 0 && s.reps >= 1),
    }))
    .filter(ex => ex.name && ex.sets.length);

  if (!exercises.length) {
    toast('Nessuna serie fatta con kg e ripetizioni validi.');
    return;
  }

  // Record: solo se il massimo supera quello precedente (la prima volta non conta).
  const records = [];
  for (const ex of exercises) {
    const prev = previousMax(ex.name);
    const max = Math.max(...ex.sets.map(s => s.kg));
    if (prev !== null && max > prev && !records.some(r => norm(r.name) === norm(ex.name))) records.push({ name: ex.name, max, prev });
  }

  const session = {
    id: d.id,
    date: d.date || todayStr(),
    planId: d.planId,
    planName: d.planName,
    createdAt: new Date().toISOString(),
    exercises,
  };
  await Store.saveSession(session);
  await Store.saveDraft(null);
  state.sessions.push(session);
  state.draft = null;
  updateTimer();
  state.summary = { session, sets: sessionSetCount(session), volume: sessionVolume(session), records };
  state.progress.exercise = '';
  render();
  window.scrollTo(0, 0);
}

/* =========================================================================
   TIMER: esercizio a tempo (plank, isometrie) e recupero tra le serie.
   Un solo timer attivo alla volta, salvato nella bozza così sopravvive alla
   chiusura dell'app:
     draft.timer = {kind: 'set' | 'rest', exercise, i, j, total, endsAt}
   Il tempo rimasto si calcola SEMPRE dall'ora di fine (endsAt), mai contando
   i "tic": niente setInterval. Il display si aggiorna con requestAnimationFrame
   e un setTimeout puntato sull'ora di fine chiude il timer anche quando i
   frame sono sospesi. Al ritorno nell'app (visibilitychange) si ricalcola tutto.
   ========================================================================= */
const TIMER_SHOW_FINISHED_MS = 20000; // quanto resta visibile "Recupero finito"
const TIMER_SOUND_GRACE_MS = 5000;    // oltre questo ritardo la fine non suona più
let timerFrame = null;
let timerEndTimeout = null;
let timerAlerted = false;
let audioCtx = null;
let wakeLock = null;

const exTimerOn = ex => !!(ex && ex.timer && ex.timer.enabled && ex.timer.seconds > 0);
const timerFor = (i, j) => {
  const t = state.draft && state.draft.timer;
  return t && t.kind === 'set' && t.i === i && t.j === j ? t : null;
};

/** Salva, ridisegna i pulsanti delle serie e aggiorna la barra del timer. */
function timerChanged() {
  saveDraft();
  render();
  updateTimer();
}

/** Recupero dell'esercizio i, a partire da startAt (di default: adesso). */
function setRestTimer(i, startAt = Date.now()) {
  const ex = state.draft.exercises[i];
  const total = restOf(ex);
  state.draft.timer = { kind: 'rest', exercise: ex.name, i, total, endsAt: startAt + total * 1000 };
  timerAlerted = state.draft.timer.endsAt <= Date.now();
}

function startRest(i) {
  setRestTimer(i);
  unlockAudio(); // va fatto durante il tocco, altrimenti iOS non suona
  keepScreenOn(true);
  timerChanged();
}

function startSetTimer(i, j) {
  const ex = state.draft.exercises[i];
  if (!exTimerOn(ex) || !ex.sets[j]) return;
  const total = ex.timer.seconds;
  state.draft.timer = { kind: 'set', exercise: ex.name, i, j, total, endsAt: Date.now() + total * 1000 };
  timerAlerted = false;
  unlockAudio();
  keepScreenOn(true);
  timerChanged();
}

function adjustRest(delta) {
  const t = state.draft && state.draft.timer;
  if (!t || t.kind === 'set') return;
  const remaining = (t.endsAt - Date.now()) / 1000;
  if (remaining <= 0) return;
  const next = Math.max(0, remaining + delta);
  t.endsAt = Date.now() + next * 1000;
  t.total = Math.max(t.total + delta, next, 1);
  saveDraft();
  updateTimer();
}

function stopTimer() {
  if (state.draft) state.draft.timer = null;
  timerChanged();
}

/** Serie a tempo finita: la segno come fatta e parte il recupero dall'ora di fine. */
function completeSetTimer(t) {
  const ex = state.draft.exercises[t.i];
  if (ex && ex.sets[t.j]) ex.sets[t.j].done = true;
  if (ex) setRestTimer(t.i, t.endsAt); else state.draft.timer = null;
  saveDraft();
  render();
}

/** Tiene allineati gli indici del timer quando si tolgono esercizi o serie. */
function shiftTimerAfterRemoval(i, j = null) {
  const t = state.draft && state.draft.timer;
  if (!t) return;
  if (j === null) {                         // tolto l'esercizio i
    if (t.i === i) state.draft.timer = null;
    else if (t.i > i) t.i -= 1;
  } else if (t.kind === 'set' && t.i === i && t.j === j) {
    state.draft.timer = null;               // tolta la serie che stava andando
  }
}

function setText(el, text) { if (el.textContent !== text) el.textContent = text; }

/** Aggiorna il timer. Tutto è calcolato da endsAt; si richiama da solo finché serve. */
function updateTimer() {
  cancelAnimationFrame(timerFrame); timerFrame = null;
  clearTimeout(timerEndTimeout); timerEndTimeout = null;
  const el = $('#rest-timer');
  const now = Date.now();
  let t = state.draft && state.draft.timer;

  if (t && t.kind === 'set' && now >= t.endsAt) {
    if (now - t.endsAt < TIMER_SOUND_GRACE_MS) alertDone();
    completeSetTimer(t);
    t = state.draft.timer;
  }
  if (!t || now - t.endsAt > TIMER_SHOW_FINISHED_MS) {
    if (t) { state.draft.timer = null; saveDraft(); }
    el.hidden = true;
    document.body.classList.remove('has-timer');
    keepScreenOn(false);
    return;
  }

  const remaining = (t.endsAt - now) / 1000;
  const finished = remaining <= 0;
  const isSet = t.kind === 'set';
  el.hidden = false;
  document.body.classList.add('has-timer');
  el.classList.toggle('finished', finished);
  el.classList.toggle('is-set', isSet);
  setText($('#rt-label'), isSet ? `${t.exercise} · serie ${t.j + 1}` : finished ? 'Recupero finito' : `Recupero · ${t.exercise}`);
  setText($('#rt-time'), finished ? 'Via!' : fmtDur(remaining));
  $('#rt-bar').style.transform = `scaleX(${finished ? 0 : Math.min(1, remaining / t.total)})`;
  if (finished && !timerAlerted) {
    timerAlerted = true;
    alertDone();
    keepScreenOn(false);
  }

  timerFrame = requestAnimationFrame(updateTimer);
  const deadline = finished ? t.endsAt + TIMER_SHOW_FINISHED_MS : t.endsAt;
  timerEndTimeout = setTimeout(updateTimer, Math.max(0, deadline - now) + 20);
}

function unlockAudio() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (audioCtx && audioCtx.state === 'running') return; // già sbloccato
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state !== 'running') audioCtx.resume();
    // Un suono muto durante il tocco "sblocca" l'audio su iOS.
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    gain.gain.value = 0;
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.01);
  } catch { /* audio non disponibile */ }
}

function alertDone() {
  try { navigator.vibrate && navigator.vibrate([200, 100, 200, 100, 300]); } catch { /* non supportato */ }
  try {
    if (!audioCtx) return;
    if (audioCtx.state !== 'running') audioCtx.resume();
    const t0 = audioCtx.currentTime + 0.05;
    [0, 0.3, 0.6].forEach((offset, n) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.value = n === 2 ? 1320 : 880;
      gain.gain.setValueAtTime(0.0001, t0 + offset);
      gain.gain.exponentialRampToValueAtTime(0.5, t0 + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + offset + 0.2);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t0 + offset); osc.stop(t0 + offset + 0.22);
    });
  } catch { /* audio non disponibile */ }
}

/** Tiene lo schermo acceso durante il recupero, dove supportato. */
async function keepScreenOn(on) {
  try {
    if (on && !wakeLock && navigator.wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } else if (!on && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch { wakeLock = null; }
}

/* =========================================================================
   VISTA: SCHEDE
   ========================================================================= */
/** "4×8 · 60 kg" se le serie sono uguali, altrimenti "55×10 · 60×8 · …" (kg×rip, come nello storico). */
function planSetsText(sets) {
  const first = sets[0];
  if (!first) return '';
  if (sets.every(s => s.reps === first.reps && s.weight === first.weight)) {
    return `${sets.length}×${first.reps}${first.weight ? ` · ${fmt(first.weight, 2)} kg` : ''}`;
  }
  return sets.map(s => `${fmt(s.weight, 2)}×${s.reps}`).join(' · ');
}

function renderSchede() {
  if (state.editor) return renderEditor();
  const cards = state.plans.map(p => {
    const delKey = `plan-${p.id}`;
    return `
      <article class="card plan-card">
        <h2>${esc(p.name)}</h2>
        <p class="ex-list">${p.exercises.length
          ? p.exercises.map(ex => `${esc(ex.name)} <span class="num">${esc(planSetsText(ex.sets))}${exTimerOn(ex) ? ` · timer ${fmtDur(ex.timer.seconds)}` : ''}</span>`).join('<br>')
          : 'Nessun esercizio'}</p>
        <div class="actions">
          <button type="button" class="btn primary small" data-action="start" data-plan="${esc(p.id)}">Inizia</button>
          <button type="button" class="btn small" data-action="plan-edit" data-id="${esc(p.id)}">Modifica</button>
          <button type="button" class="btn small danger ${armed(delKey) ? 'armed' : ''}" data-action="plan-delete" data-id="${esc(p.id)}">${armed(delKey) ? 'Conferma' : 'Elimina'}</button>
        </div>
      </article>`;
  }).join('');

  return `
    <header class="view-head"><h1>Schede</h1></header>
    <div class="row">
      <button type="button" class="btn primary" data-action="plan-new">+ Nuova scheda</button>
      <button type="button" class="btn soft" data-action="plan-examples">Aggiungi esempi</button>
    </div>
    ${cards || `<div class="card empty"><h2>Nessuna scheda</h2><p>Crea una scheda oppure aggiungi gli esempi Push, Pull e Gambe.</p></div>`}`;
}

function renderEditor() {
  const e = state.editor;
  const rows = e.exercises.map((ex, k) => `
    <div class="ed-ex">
      <div class="top">
        <label class="field"><span>Esercizio ${k + 1}</span>
          <input type="text" data-efield="name" data-k="${k}" value="${esc(ex.name)}" list="exercise-names-schede" placeholder="Es. Panca piana" autocomplete="off"></label>
        <button type="button" class="icon-btn" data-action="ed-remove-ex" data-k="${k}" aria-label="Rimuovi esercizio ${k + 1}">${ICON.close}</button>
      </div>
      <div class="ed-sets">
        <div class="ed-set-row head" aria-hidden="true"><span>#</span><span>Rip.</span><span>Kg</span><span></span></div>
        ${ex.sets.map((set, s) => `
        <div class="ed-set-row">
          <span class="set-n">${s + 1}</span>
          <input type="text" inputmode="numeric" autocomplete="off" data-efield="reps" data-k="${k}" data-s="${s}" value="${esc(set.reps)}" placeholder="rip" aria-label="${esc(ex.name || `Esercizio ${k + 1}`)}, serie ${s + 1}, ripetizioni">
          <input type="text" inputmode="decimal" autocomplete="off" data-efield="weight" data-k="${k}" data-s="${s}" value="${esc(set.weight)}" placeholder="kg" aria-label="${esc(ex.name || `Esercizio ${k + 1}`)}, serie ${s + 1}, kg">
          <button type="button" class="icon-btn" data-action="ed-remove-set" data-k="${k}" data-s="${s}" aria-label="Elimina serie ${s + 1}" title="Elimina serie" ${ex.sets.length <= 1 ? 'disabled' : ''}>${ICON.close}</button>
        </div>`).join('')}
      </div>
      <button type="button" class="btn small soft" data-action="ed-add-set" data-k="${k}">+ Serie</button>
      <div class="rest-row">
        <span class="rest-label">${ICON.timer} Recupero</span>
        <div class="stepper" role="group" aria-label="Recupero tra le serie">
          <button type="button" data-action="ed-rest" data-k="${k}" data-delta="-${Model.REST.step}" aria-label="Riduci recupero di ${Model.REST.step} secondi" ${ex.rest <= Model.REST.min ? 'disabled' : ''}>−${Model.REST.step}s</button>
          <output class="num" aria-live="polite">${fmtDur(ex.rest)}</output>
          <button type="button" data-action="ed-rest" data-k="${k}" data-delta="${Model.REST.step}" aria-label="Aumenta recupero di ${Model.REST.step} secondi" ${ex.rest >= Model.REST.max ? 'disabled' : ''}>+${Model.REST.step}s</button>
        </div>
      </div>
      <div class="timer-row">
        <label class="switch-row">
          <span class="rest-label">${ICON.timer} Timer</span>
          <input type="checkbox" role="switch" class="switch" data-efield="timer-enabled" data-k="${k}" ${ex.timer.enabled ? 'checked' : ''}
            aria-label="Timer per ${esc(ex.name || `esercizio ${k + 1}`)} (esercizi a tempo)">
        </label>
        ${ex.timer.enabled ? `
        <label class="field timer-seconds"><span>Durata (secondi)</span>
          <input type="text" inputmode="numeric" autocomplete="off" data-efield="timer-seconds" data-k="${k}" value="${esc(ex.timer.seconds)}" placeholder="30"></label>` : ''}
      </div>
    </div>`).join('');

  return `
    <header class="view-head"><h1>${e.id ? 'Modifica scheda' : 'Nuova scheda'}</h1></header>
    <form class="card editor" data-form="editor" autocomplete="off">
      <label class="field"><span>Nome della scheda</span>
        <input type="text" data-efield="plan-name" value="${esc(e.name)}" placeholder="Es. Push" required></label>
      ${rows}
      <button type="button" class="btn soft" data-action="ed-add-ex">+ Esercizio</button>
    </form>
    <datalist id="exercise-names-schede">${knownExerciseNames().map(n => `<option value="${esc(n)}">`).join('')}</datalist>
    <div class="row">
      <button type="button" class="btn" data-action="ed-cancel">Annulla</button>
      <button type="button" class="btn primary" data-action="ed-save">Salva scheda</button>
    </div>`;
}

const blankEditorExercise = () => ({ id: uid(), name: '', rest: Model.REST.default, timer: { enabled: false, seconds: String(Model.TIMER.seconds) }, sets: Array.from({ length: 3 }, () => ({ reps: '10', weight: '' })) });

function openEditor(planId) {
  const p = state.plans.find(x => x.id === planId);
  state.editor = p
    ? { id: p.id, name: p.name, exercises: p.exercises.map(ex => ({
        id: ex.id || uid(), name: ex.name, rest: restOf(ex),
        timer: (tm => ({ enabled: tm.enabled, seconds: String(tm.seconds) }))(Model.cleanTimer(ex.timer)),
        sets: ex.sets.map(s => ({ reps: String(s.reps), weight: fmtKgInput(s.weight) })),
      })) }
    : { id: null, name: '', exercises: [blankEditorExercise()] };
  render();
  window.scrollTo(0, 0);
}

async function saveEditor() {
  const e = state.editor;
  const name = e.name.trim();
  if (!name) return toast('Dai un nome alla scheda.');
  const exercises = e.exercises
    .filter(ex => ex.name.trim())
    .map(ex => Model.migratePlanExercise({ id: ex.id, name: ex.name, sets: ex.sets, rest: ex.rest, timer: ex.timer })); // pulisce i valori (rip ≥ 1, kg ≥ 0)
  if (!exercises.length) return toast('Aggiungi almeno un esercizio.');
  const plan = { id: e.id || uid(), name, exercises };
  const plans = e.id ? state.plans.map(p => p.id === e.id ? plan : p) : [...state.plans, plan];
  await Store.savePlans(plans);
  state.plans = plans;
  state.editor = null;
  toast('Scheda salvata.');
  render();
}

async function addExamplePlans() {
  const existing = new Set(state.plans.map(p => norm(p.name)));
  const toAdd = EXAMPLE_PLANS.filter(p => !existing.has(norm(p.name))).map(p => ({
    id: uid(),
    name: p.name,
    exercises: p.exercises.map(([name, sets, opt = {}]) => Model.migratePlanExercise({
      id: uid(), name, sets: sets.map(([reps, weight]) => ({ reps, weight })),
      timer: opt.timer ? { enabled: true, seconds: opt.timer } : undefined,
    })),
  }));
  if (!toAdd.length) return toast('Gli esempi sono già presenti.');
  const plans = [...state.plans, ...toAdd];
  await Store.savePlans(plans);
  state.plans = plans;
  toast(`Aggiunte ${toAdd.length} schede di esempio.`);
  render();
}

/* =========================================================================
   VISTA: PROGRESSI
   ========================================================================= */
const METRICS = {
  max: { label: 'Peso max', key: 'max', unit: 'kg' },
  orm: { label: '1RM stimato', key: 'orm', unit: 'kg' },
  volume: { label: 'Volume', key: 'volume', unit: 'kg' },
};

function renderProgressi() {
  const names = knownExerciseNames({ withHistoryOnly: true });
  if (!names.length) {
    return `
      <header class="view-head"><h1>Progressi</h1></header>
      <div class="card empty"><h2>Ancora nessun dato</h2><p>Termina il primo allenamento e qui vedrai grafici e record per ogni esercizio.</p></div>`;
  }
  if (!names.some(n => norm(n) === norm(state.progress.exercise))) state.progress.exercise = names[0];

  const metric = METRICS[state.progress.metric];
  const hist = exerciseHistory(state.progress.exercise);
  const first = hist[0], lastH = hist[hist.length - 1];
  const bestMax = Math.max(...hist.map(h => h.max));
  const bestMaxDate = hist.find(h => h.max === bestMax).date;
  const bestOrm = Math.max(...hist.map(h => h.orm));
  const delta = lastH[metric.key] - first[metric.key];
  const deltaPct = first[metric.key] > 0 ? (delta / first[metric.key]) * 100 : null;
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '';

  const width = Math.max(240, Math.min(608, ($('#view-progressi').clientWidth || 340) - 30));
  const points = hist.map(h => ({ date: h.date, v: h[metric.key] }));

  return `
    <header class="view-head"><h1>Progressi</h1></header>
    <label class="field"><span>Esercizio</span>
      <select data-field="progress-ex">${names.map(n => `<option value="${esc(n)}" ${norm(n) === norm(state.progress.exercise) ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>
    </label>
    <div class="segmented" role="group" aria-label="Metrica">
      ${Object.entries(METRICS).map(([k, m]) => `<button type="button" data-action="metric" data-metric="${k}" aria-pressed="${k === state.progress.metric}">${m.label}</button>`).join('')}
    </div>
    <article class="card">
      <div class="chart-wrap">${chartSVG(points, width, metric)}</div>
    </article>
    <div class="tiles">
      <div class="tile record"><div class="label">Record</div><div class="value">${fmt(bestMax, 2)}<small>kg</small></div><div class="hint">${esc(fmtDateRel(bestMaxDate))}</div></div>
      <div class="tile"><div class="label">1RM migliore</div><div class="value">${fmt(bestOrm, 1)}<small>kg</small></div><div class="hint">stima Epley</div></div>
      <div class="tile"><div class="label">Sessioni</div><div class="value">${hist.length}</div><div class="hint">dal ${esc(fmtDate(first.date, { day: 'numeric', month: 'short', year: '2-digit' }))}</div></div>
      <div class="tile"><div class="label">Variazione</div><div class="value">${hist.length > 1 ? `${sign}${fmt(Math.abs(delta), metric.key === 'volume' ? 0 : 1)}<small>kg</small>` : '–'}</div>
        <div class="hint">${hist.length > 1 ? `${deltaPct !== null ? `${sign}${fmt(Math.abs(deltaPct), 0)}% ` : ''}${esc(metric.label.toLowerCase())}` : 'serve più di una sessione'}</div></div>
    </div>
    <h2 class="section-title">Ultime sessioni</h2>
    <article class="card list">
      ${[...hist].reverse().slice(0, 5).map(h => `
        <div class="list-item">
          <div class="main"><strong>${esc(fmtDateRel(h.date))}</strong> <span class="muted">· ${esc(h.planName)}</span>
            <div class="sets-txt num">${esc(setsText(h.sets))}</div></div>
          <div class="right">${fmt(h[metric.key], metric.key === 'volume' ? 0 : 1)} <small class="muted">kg</small></div>
        </div>`).join('')}
    </article>`;
}

function niceScale(min, max, count = 4) {
  const range = max - min || 1;
  const rough = range / count;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const r = rough / mag;
  const step = (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let t = lo; t <= hi + step / 2; t += step) ticks.push(Math.round(t * 1000) / 1000);
  return { lo, hi: hi === lo ? lo + step : hi, ticks };
}

/** Grafico a linea in SVG, disegnato a mano. */
function chartSVG(points, W, metric) {
  const H = 220, pl = 46, pr = 16, pt = 22, pb = 30;
  const vals = points.map(p => p.v);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (min === max) { const pad = max === 0 ? 1 : Math.abs(max) * 0.1; min = Math.max(0, min - pad); max += pad; }
  const { lo, hi, ticks } = niceScale(min, max, 4);
  const iw = W - pl - pr, ih = H - pt - pb;
  const x = i => points.length === 1 ? pl + iw / 2 : pl + (i * iw) / (points.length - 1);
  const y = v => pt + ((hi - v) * ih) / (hi - lo);

  const grid = ticks.map(t => `
    <line class="grid" x1="${pl}" x2="${W - pr}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"/>
    <text class="axis-label" x="${pl - 8}" y="${(y(t) + 4).toFixed(1)}" text-anchor="end">${fmt(t, 1)}</text>`).join('');

  // Etichette date: al massimo 4, distribuite.
  const n = points.length;
  const labelIdx = n <= 4 ? points.map((_, i) => i) : [0, Math.round((n - 1) / 3), Math.round((2 * (n - 1)) / 3), n - 1];
  const xLabels = [...new Set(labelIdx)].map(i => {
    const anchor = n === 1 ? 'middle' : i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle';
    return `<text class="axis-label" x="${x(i).toFixed(1)}" y="${H - 8}" text-anchor="${anchor}">${esc(fmtDate(points[i].date, { day: 'numeric', month: 'short' }))}</text>`;
  }).join('');

  const coords = points.map((p, i) => [x(i), y(p.v)]);
  const line = coords.map(([cx, cy], i) => `${i ? 'L' : 'M'}${cx.toFixed(1)},${cy.toFixed(1)}`).join(' ');
  const area = n > 1 ? `${line} L${coords[n - 1][0].toFixed(1)},${(pt + ih).toFixed(1)} L${coords[0][0].toFixed(1)},${(pt + ih).toFixed(1)} Z` : '';
  const best = Math.max(...vals);
  const bestIdx = vals.lastIndexOf(best);
  const dots = coords.map(([cx, cy], i) => `
    <circle class="dot ${i === bestIdx ? 'best' : ''}" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${n > 40 ? 3 : 4.5}">
      <title>${esc(fmtDate(points[i].date))}: ${fmt(points[i].v, 1)} ${metric.unit}</title></circle>`).join('');
  const [lx, ly] = coords[n - 1];
  const lastLabel = `<text class="value-label" x="${lx.toFixed(1)}" y="${(ly - 10).toFixed(1)}" text-anchor="${n === 1 ? 'middle' : 'end'}">${fmt(points[n - 1].v, 1)}</text>`;

  return `
    <svg class="chart" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img"
      aria-label="${esc(metric.label)} per sessione, ${n} ${n === 1 ? 'punto' : 'punti'}, ultimo valore ${fmt(points[n - 1].v, 1)} kg">
      ${grid}
      ${area ? `<path class="area" d="${area}"/>` : ''}
      ${n > 1 ? `<path class="line" d="${line}"/>` : ''}
      ${dots}
      ${lastLabel}
      ${xLabels}
    </svg>`;
}

/* =========================================================================
   VISTA: STORICO
   ========================================================================= */
function renderStorico() {
  const list = sortedSessions().map(s => {
    const open = state.openSessions.has(s.id);
    const delKey = `sess-${s.id}`;
    const dt = parseDate(s.date);
    return `
      <article class="card session ${open ? 'open' : ''}">
        <button type="button" class="session-head" data-action="sess-toggle" data-id="${esc(s.id)}" aria-expanded="${open}">
          <span class="date"><span class="d">${dt.getDate()}</span><span class="m">${esc(dt.toLocaleDateString('it-IT', { month: 'short' }))}${dt.getFullYear() !== new Date().getFullYear() ? ` ${String(dt.getFullYear()).slice(2)}` : ''}</span></span>
          <span class="info"><strong>${esc(s.planName)}</strong>
            <span>${plural(s.exercises.length, 'esercizio', 'esercizi')} · ${sessionSetCount(s)} serie · ${fmt(sessionVolume(s), 0)} kg</span></span>
          ${ICON.chev}
        </button>
        ${open ? `
          <div class="session-body">
            <div class="table-wrap">
              <table class="sets-table">
                <thead><tr><th>Esercizio</th><th>Serie (kg×rip)</th><th style="text-align:right">Max</th></tr></thead>
                <tbody>${s.exercises.map(ex => `
                  <tr><td>${esc(ex.name)}</td><td class="sets-col num">${esc(setsText(ex.sets))}</td>
                  <td class="num">${fmt(Math.max(...ex.sets.map(x => x.kg)), 2)}</td></tr>`).join('')}</tbody>
              </table>
            </div>
            <button type="button" class="btn small danger ${armed(delKey) ? 'armed' : ''}" data-action="sess-delete" data-id="${esc(s.id)}">
              ${armed(delKey) ? 'Tocca ancora per eliminare' : 'Elimina allenamento'}</button>
          </div>` : ''}
      </article>`;
  }).join('');

  const lb = state.lastBackup;
  const daysSince = lb ? Math.floor((Date.now() - timeOf(lb)) / 86400000) : null;
  const backupMsg = !state.sessions.length && !state.plans.length
    ? 'Puoi importare un backup salvato in precedenza.'
    : lb
      ? `<span class="${daysSince > 14 ? 'warn' : ''}">Ultimo backup: ${esc(new Date(lb).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }))}.</span>`
      : '<span class="warn">Non hai ancora fatto un backup.</span>';

  return `
    <header class="view-head"><h1>Storico</h1><span class="sub">${plural(state.sessions.length, 'allenamento', 'allenamenti')}</span></header>
    ${list || '<div class="card empty"><h2>Nessun allenamento</h2><p>Gli allenamenti terminati compariranno qui.</p></div>'}
    <h2 class="section-title">Backup</h2>
    <article class="card backup">
      <p>Safari può cancellare i dati delle app poco usate: esporta ogni tanto un file di backup (in File di iCloud, per esempio). ${backupMsg}</p>
      <div class="row">
        <button type="button" class="btn primary" data-action="export">Esporta dati</button>
        <button type="button" class="btn" data-action="import">Importa backup</button>
      </div>
    </article>`;
}

/* ---------- Backup JSON ---------- */
async function exportData() {
  const data = {
    app: 'diario-palestra',
    version: Model.DATA_VERSION, // versione del modello dati (vedi model.js)
    exportedAt: new Date().toISOString(),
    plans: state.plans,
    sessions: state.sessions,
  };
  const name = `diario-palestra-${todayStr()}.json`;
  const json = JSON.stringify(data, null, 2);
  const file = new File([json], name, { type: 'application/json' });

  // Su iPhone il foglio di condivisione permette "Salva in File".
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Backup Diario Palestra' });
    } catch (err) {
      if (err.name === 'AbortError') return;
      throw err;
    }
  } else {
    const url = URL.createObjectURL(file);
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  await Store.markBackup();
  state.lastBackup = await Store.getLastBackup();
  toast('Backup esportato.');
  render();
}

function cleanSession(s) {
  if (!s || typeof s !== 'object' || !/^\d{4}-\d{2}-\d{2}$/.test(String(s.date)) || !Array.isArray(s.exercises)) return null;
  const exercises = s.exercises
    .filter(ex => ex && String(ex.name ?? '').trim() && Array.isArray(ex.sets))
    .map(ex => ({
      name: String(ex.name).trim(),
      sets: ex.sets.map(x => ({ kg: toNum(x && x.kg), reps: Math.round(toNum(x && x.reps)) })).filter(x => x.kg >= 0 && x.reps >= 1),
    }))
    .filter(ex => ex.sets.length);
  if (!exercises.length) return null;
  return {
    id: String(s.id || uid()),
    date: s.date,
    planId: s.planId ?? null,
    planName: String(s.planName || 'Allenamento'),
    createdAt: s.createdAt || new Date().toISOString(),
    exercises,
  };
}

/** Importa un backup unendolo ai dati esistenti (stesso id = sostituito). */
async function importFile(file) {
  let data;
  try { data = JSON.parse(await file.text()); } catch { throw new Error('Il file non è un JSON valido.'); }
  if (!data || typeof data !== 'object') throw new Error('Il file non è un backup di Diario Palestra.');
  // I backup senza "version" sono della versione 1. Le schede vecchie vengono migrate.
  const version = Number(data.version) || 1;
  if (version > Model.DATA_VERSION) throw new Error('Questo backup è stato creato da una versione più recente dell\'app. Aggiorna l\'app e riprova.');
  const plansIn = Model.migratePlans(data.plans);
  const sessionsIn = (Array.isArray(data.sessions) ? data.sessions : []).map(cleanSession).filter(Boolean);
  if (!plansIn.length && !sessionsIn.length) throw new Error('Nel file non ci sono schede né allenamenti.');

  const plans = new Map(state.plans.map(p => [p.id, p]));
  plansIn.forEach(p => plans.set(p.id, p));
  const sessions = new Map(state.sessions.map(s => [s.id, s]));
  sessionsIn.forEach(s => sessions.set(s.id, s));

  const next = { plans: [...plans.values()], sessions: [...sessions.values()] };
  await Store.replaceAll(next);
  state.plans = next.plans;
  state.sessions = next.sessions;
  toast(`Importati: ${plural(sessionsIn.length, 'allenamento', 'allenamenti')}, ${plural(plansIn.length, 'scheda', 'schede')}.`);
  render();
}

/* =========================================================================
   Rendering e navigazione
   ========================================================================= */
const RENDERERS = { oggi: renderOggi, schede: renderSchede, progressi: renderProgressi, storico: renderStorico };

function render() {
  const el = $(`#view-${state.view}`);
  el.innerHTML = RENDERERS[state.view]();
}

function showView(view) {
  if (!RENDERERS[view]) return;
  const changed = view !== state.view;
  state.view = view;
  state.confirm = null;
  for (const name of Object.keys(RENDERERS)) {
    $(`#view-${name}`).hidden = name !== view;
    const tab = $(`#tab-${name}`);
    if (name === view) tab.setAttribute('aria-current', 'page'); else tab.removeAttribute('aria-current');
  }
  render();
  if (changed) window.scrollTo(0, 0);
}

/* ---------- Eventi (delegati) ---------- */
const ACTIONS = {
  'tab': el => showView(el.dataset.view),
  'start': el => startWorkout(el.dataset.plan),

  'set-toggle': el => {
    const row = el.closest('.set-row');
    const set = state.draft.exercises[+row.dataset.i].sets[+row.dataset.j];
    set.done = !set.done;
    row.classList.toggle('done', set.done);
    el.setAttribute('aria-pressed', String(set.done));
    if (state.confirm === 'finish') state.confirm = null;
    saveDraft();
    updateDraftProgress();
  },
  'set-add': el => {
    const ex = state.draft.exercises[+el.dataset.i];
    const prev = ex.sets[ex.sets.length - 1];
    ex.sets.push({ kg: prev ? prev.kg : '', reps: prev ? prev.reps : '', done: false });
    saveDraft(); render();
  },
  'set-remove': el => {
    const ex = state.draft.exercises[+el.dataset.i];
    if (ex.sets.length > 1) { shiftTimerAfterRemoval(+el.dataset.i, ex.sets.length - 1); ex.sets.pop(); }
    saveDraft(); render(); updateTimer();
  },
  'ex-remove': el => {
    const i = +el.dataset.i;
    const ex = state.draft.exercises[i];
    if (ex.sets.some(s => s.done) && !confirmTwice(`ex-${i}`)) return;
    shiftTimerAfterRemoval(i);
    state.draft.exercises.splice(i, 1);
    state.confirm = null;
    saveDraft(); render(); updateTimer();
  },
  'finish': () => {
    const pending = state.draft.exercises.reduce((n, ex) => n + ex.sets.filter(s => !s.done).length, 0);
    if (pending > 0 && !confirmTwice('finish')) return;
    return finishWorkout();
  },
  'discard': () => {
    if (!confirmTwice('discard')) return;
    state.draft = null;
    saveDraft(); render(); updateTimer();
    toast('Allenamento annullato.');
  },
  'summary-close': () => { state.summary = null; render(); },

  'plan-new': () => openEditor(null),
  'plan-edit': el => openEditor(el.dataset.id),
  'plan-delete': async el => {
    const id = el.dataset.id;
    if (!confirmTwice(`plan-${id}`)) return;
    const plans = state.plans.filter(p => p.id !== id);
    await Store.savePlans(plans);
    state.plans = plans;
    render();
  },
  'plan-examples': () => addExamplePlans(),
  'ed-add-ex': () => {
    state.editor.exercises.push(blankEditorExercise());
    render();
    const inputs = document.querySelectorAll('[data-efield="name"]');
    inputs[inputs.length - 1]?.focus();
  },
  'ed-rest': el => {
    const ex = state.editor.exercises[+el.dataset.k];
    ex.rest = Model.cleanRest(ex.rest + Number(el.dataset.delta));
    render();
  },
  'rest-start': el => startRest(+el.dataset.i),
  'rest-adjust': el => adjustRest(Number(el.dataset.delta)),
  'rest-stop': () => stopTimer(),
  'set-timer': el => startSetTimer(+el.dataset.i, +el.dataset.j),
  'timer-stop': () => stopTimer(),
  'ed-remove-ex': el => { state.editor.exercises.splice(+el.dataset.k, 1); render(); },
  'ed-add-set': el => {
    const sets = state.editor.exercises[+el.dataset.k].sets;
    const last = sets[sets.length - 1];
    sets.push(last ? { ...last } : { reps: '10', weight: '' });
    render();
  },
  'ed-remove-set': el => {
    const sets = state.editor.exercises[+el.dataset.k].sets;
    if (sets.length > 1) sets.splice(+el.dataset.s, 1);
    render();
  },
  'ed-cancel': () => { state.editor = null; render(); },
  'ed-save': () => saveEditor(),

  'metric': el => { state.progress.metric = el.dataset.metric; render(); },

  'sess-toggle': el => {
    const id = el.dataset.id;
    if (state.openSessions.has(id)) state.openSessions.delete(id); else state.openSessions.add(id);
    render();
  },
  'sess-delete': async el => {
    const id = el.dataset.id;
    if (!confirmTwice(`sess-${id}`)) return;
    await Store.deleteSession(id);
    state.sessions = state.sessions.filter(s => s.id !== id);
    state.openSessions.delete(id);
    toast('Allenamento eliminato.');
    render();
  },

  'export': () => exportData(),
  'import': () => $('#import-file').click(),
  'update-app': () => applyUpdate(),
};

function updateDraftProgress() {
  const pill = $('#progress-pill');
  if (!pill || !state.draft) return;
  const total = state.draft.exercises.reduce((n, ex) => n + ex.sets.length, 0);
  const done = state.draft.exercises.reduce((n, ex) => n + ex.sets.filter(s => s.done).length, 0);
  pill.textContent = `${done}/${total} serie`;
  const finish = $('[data-action="finish"]');
  if (finish && state.confirm !== 'finish') {
    finish.classList.remove('armed');
    finish.textContent = 'Termina allenamento';
  }
}

// iOS sblocca l'audio solo durante un tocco: lo faccio al primo tocco utile,
// così il suono di fine funziona anche se l'app è stata riaperta a timer avviato.
document.addEventListener('pointerdown', unlockAudio, { passive: true });

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const action = ACTIONS[el.dataset.action];
  if (action) safely(() => action(el));
});

document.addEventListener('input', e => {
  const t = e.target;
  // Allenamento in corso: aggiorno lo stato senza ridisegnare (il campo resta attivo).
  if (t.dataset.field === 'kg' || t.dataset.field === 'reps') {
    const row = t.closest('.set-row');
    if (!row || !state.draft) return;
    state.draft.exercises[+row.dataset.i].sets[+row.dataset.j][t.dataset.field] = t.value;
    saveDraft({ immediate: false });
    return;
  }
  if (t.dataset.field === 'draft-date' && state.draft) {
    if (t.value) { state.draft.date = t.value; saveDraft(); }
    return;
  }
  // Editor della scheda
  if (t.dataset.efield && state.editor) {
    if (t.dataset.efield === 'plan-name') state.editor.name = t.value;
    else if (t.dataset.efield === 'timer-enabled') {
      state.editor.exercises[+t.dataset.k].timer.enabled = t.checked;
      render(); // mostra/nasconde il campo durata
    }
    else if (t.dataset.efield === 'timer-seconds') state.editor.exercises[+t.dataset.k].timer.seconds = t.value;
    else if (t.dataset.s !== undefined) state.editor.exercises[+t.dataset.k].sets[+t.dataset.s][t.dataset.efield] = t.value;
    else state.editor.exercises[+t.dataset.k][t.dataset.efield] = t.value;
  }
});

document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.field === 'progress-ex') { state.progress.exercise = t.value; render(); return; }
  if (t.id === 'import-file' && t.files && t.files[0]) {
    const file = t.files[0];
    t.value = '';
    safely(() => importFile(file));
  }
});

document.addEventListener('submit', e => {
  const form = e.target;
  if (form.dataset.form === 'add-ex') {
    e.preventDefault();
    addDraftExercise(form.elements.name.value);
    $('[data-form="add-ex"] input')?.focus();
  } else if (form.dataset.form === 'editor') {
    e.preventDefault();
    safely(saveEditor);
  }
});

// Invio sulla tastiera: passa al campo successivo della serie.
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || !e.target.closest('.set-row')) return;
  e.preventDefault();
  const inputs = [...document.querySelectorAll('#view-oggi .set-row input')];
  const next = inputs[inputs.indexOf(e.target) + 1];
  if (next) next.focus(); else e.target.blur();
});

// Prima di chiudere/nascondere l'app, salvo subito la bozza.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && state.draft) saveDraft();
  if (document.visibilityState === 'visible') {
    checkForUpdate();
    if (state.draft && state.draft.timer) {
      updateTimer();
      if (!state.draft || !state.draft.timer) return;
      if (state.draft.timer.endsAt > Date.now()) keepScreenOn(true); // il blocco schermo si perde in background
    }
  }
});

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { if (state.view === 'progressi') render(); }, 150);
});

/* =========================================================================
   Service worker (offline + aggiornamenti)
   ========================================================================= */
let swReg = null;
let reloadOnChange = false;

function showUpdateBanner() { $('#update-banner').hidden = false; }
function applyUpdate() {
  if (!swReg || !swReg.waiting) return location.reload();
  reloadOnChange = true;
  swReg.waiting.postMessage({ type: 'SKIP_WAITING' });
}
function checkForUpdate() { if (swReg) swReg.update().catch(() => {}); }

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    swReg = await navigator.serviceWorker.register('sw.js');
    if (swReg.waiting && navigator.serviceWorker.controller) showUpdateBanner();
    swReg.addEventListener('updatefound', () => {
      const sw = swReg.installing;
      sw && sw.addEventListener('statechange', () => {
        if (sw.state === 'installed' && navigator.serviceWorker.controller) showUpdateBanner();
      });
    });
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloadOnChange) location.reload();
    });
  } catch (err) {
    console.warn('Service worker non registrato:', err);
  }
}

/* ---------- Avvio ---------- */
(async function init() {
  try {
    const data = await Store.load();
    state.plans = data.plans;
    state.sessions = data.sessions;
    state.draft = data.draft && Array.isArray(data.draft.exercises) ? data.draft : null;
    state.lastBackup = await Store.getLastBackup();
  } catch (err) {
    console.error(err);
    toast('Impossibile leggere i dati salvati.');
  }
  showView('oggi');
  if (state.draft && state.draft.timer) timerAlerted = state.draft.timer.endsAt <= Date.now();
  updateTimer();
  Store.requestPersistence();
  registerServiceWorker();
})();
