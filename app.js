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
const dateStr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayStr = () => dateStr(new Date());
const daysAgoStr = n => { const d = new Date(); d.setDate(d.getDate() - n); return dateStr(d); };
const fmt = (n, dec = 1) => Number.isFinite(n) ? n.toLocaleString('it-IT', { maximumFractionDigits: dec }) : '–';
/** kg per i campi di testo: virgola italiana, niente zeri inutili (60, 62,5), arrotondati a 0,01. */
const fmtKgInput = n => Number.isFinite(n) && n >= 0 ? String(Math.round(n * 100) / 100).replace('.', ',') : '';
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
/** Timer iniziale di un esercizio: quello della scheda se c'è, altrimenti acceso a 30 s solo se è "a tempo". */
const defaultTimer = (info, fromPlan) => fromPlan ? Model.cleanTimer(fromPlan.timer) : { enabled: !!(info && info.timed), seconds: Model.TIMER.seconds };
/** Secondi digitati: vuoto o non valido = 0 (nessun pulsante "Avvia timer"), massimo 3600. */
const typedSeconds = v => { const n = Math.round(toNum(v)); return Number.isFinite(n) && n > 0 ? Math.min(Model.TIMER.max, n) : 0; };

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
  progress: { exercise: '', metric: 'max', mode: 'exercises', range: '90' },
  bodyWeights: [],   // peso corporeo, in ordine di data
  bodyForm: { date: '', kg: '' },
  bodyShowAll: false,
  settings: { ...Model.DEFAULT_SETTINGS },
  library: null,          // libreria esercizi (data/esercizi.json) con indice per id
  customExercises: [],    // esercizi personalizzati dell'utente
  picker: null,           // selettore/libreria aperto: {mode, query, part, equip, detail, form}
  noteEdit: null,         // indice dell'esercizio con la nota aperta in modifica (allenamento in corso)
  openSessions: new Set(),
  confirm: null,     // chiave del pulsante "armato" (eliminazione a due passaggi)
  lastBackup: null,
};

/* ---------- Esempi ---------- */
// Ogni serie è [ripetizioni, kg]; same() crea serie identiche.
const same = (n, reps, kg) => Array.from({ length: n }, () => [reps, kg]);
// Gli esercizi sono id della libreria (data/esercizi.json).
const EXAMPLE_PLANS = [
  { name: 'Push', exercises: [
    ['panca-piana-bilanciere', [[10, 55], [8, 60], [8, 60], [6, 65]]], ['spinte-manubri-panca-inclinata', same(3, 10, 22)],
    ['lento-avanti-manubri', [[10, 14], [10, 16], [8, 16]]], ['alzate-laterali-manubri', same(3, 12, 8)], ['push-down-cavo', same(3, 12, 25)],
  ] },
  { name: 'Pull', exercises: [
    ['trazioni-presa-prona', same(4, 6, 0)], ['rematore-bilanciere', [[10, 45], [8, 50], [8, 50], [6, 55]]], ['lat-machine-avanti', same(3, 10, 45)],
    ['face-pull', same(3, 15, 15)], ['curl-bilanciere', same(3, 10, 25)],
  ] },
  { name: 'Gambe', exercises: [
    ['squat-bilanciere', [[8, 70], [6, 80], [6, 80], [5, 85]]], ['stacco-rumeno', same(3, 8, 70)], ['leg-press', same(3, 10, 120)],
    ['leg-curl-sdraiato', same(3, 12, 35)], ['calf-in-piedi-macchina', same(4, 12, 40)], ['plank', same(3, 1, 0), { timer: 45 }],
  ] },
];

/* ---------- Interrogazioni sullo storico ---------- */
function sortedSessions() {
  return [...state.sessions].sort((a, b) => b.date.localeCompare(a.date) || timeOf(b.createdAt) - timeOf(a.createdAt));
}

/* ---------- Libreria ed esercizi ---------- */
/**
 * Chiave di un esercizio per storico, record e grafici: l'exerciseId; per i dati
 * vecchi ancora senza id si ripiega sul nome (maiuscole e spazi ai bordi ignorati).
 */
const exKey = ex => (ex && ex.exerciseId) || `name:${norm(ex && ex.name)}`;
const fold = s => Model.fold(s);

async function loadLibrary() {
  try {
    const res = await fetch('data/esercizi.json');
    if (!res.ok) throw new Error(res.status);
    const lib = await res.json();
    if (!Array.isArray(lib.exercises)) throw new Error('formato');
    lib.byId = new Map(lib.exercises.map(e => [e.id, e]));
    return lib;
  } catch (err) {
    console.warn('Libreria esercizi non disponibile:', err);
    return null;
  }
}

/** Scheda dell'esercizio: dalla libreria o tra i personalizzati (null se sconosciuto o eliminato). */
function exerciseInfo(id) {
  if (!id) return null;
  return (state.library && state.library.byId.get(id)) || state.customExercises.find(c => c.id === id) || null;
}

/** Tutti gli esercizi selezionabili: libreria + personalizzati. */
function allExercises() {
  return [...(state.library ? state.library.exercises : []), ...state.customExercises];
}

/** Ultima esecuzione di un esercizio (per chiave: exerciseId o nome). */
function lastPerformance(key) {
  for (const s of sortedSessions()) {
    const ex = s.exercises.find(e => exKey(e) === key && e.sets.length);
    if (ex) return { date: s.date, sets: ex.sets };
  }
  return null;
}

/** Nota dell'ultima sessione con questo esercizio ('' se non c'è): si precompila nell'allenamento. */
function lastNote(key) {
  for (const s of sortedSessions()) {
    const ex = s.exercises.find(e => exKey(e) === key);
    if (ex) return Model.cleanNote(ex.note).trim();
  }
  return '';
}

/** Peso massimo mai sollevato in un esercizio (null se mai fatto), con la data. */
function previousMax(key) {
  let max = null, date = null;
  for (const s of state.sessions) for (const ex of s.exercises) {
    if (exKey(ex) !== key) continue;
    for (const set of ex.sets) if (max === null || set.kg > max || (set.kg === max && s.date < date)) { max = set.kg; date = s.date; }
  }
  return max === null ? null : { max, date };
}

/** Storico di un esercizio in ordine cronologico, con le metriche per sessione. */
function exerciseHistory(key) {
  const out = [];
  for (const s of [...sortedSessions()].reverse()) {
    const exs = s.exercises.filter(e => exKey(e) === key);
    const sets = exs.flatMap(e => e.sets);
    if (!sets.length) continue;
    out.push({
      date: s.date, planName: s.planName, sets,
      note: exs.map(e => String(e.note || '').trim()).filter(Boolean).join(' · '),
      max: Math.max(...sets.map(x => x.kg)),
      orm: Math.max(...sets.map(x => epley(x.kg, x.reps))),
      volume: setsVolume(sets),
    });
  }
  return out;
}

/**
 * Esercizi già usati (storico prima, poi schede), senza doppioni: [{key, name}].
 * Nome mostrato: quello attuale per i personalizzati, altrimenti l'ultimo usato.
 */
function knownExercises({ withHistoryOnly = false } = {}) {
  const seen = new Map();
  const add = ex => {
    const key = exKey(ex);
    if (seen.has(key)) return;
    const custom = ex.exerciseId && Model.isCustomId(ex.exerciseId) ? exerciseInfo(ex.exerciseId) : null;
    seen.set(key, { key, name: custom ? custom.name : String(ex.name).trim() });
  };
  for (const s of sortedSessions()) for (const ex of s.exercises) if (ex.sets.length) add(ex);
  if (!withHistoryOnly) for (const p of state.plans) for (const ex of p.exercises) add(ex);
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
  armTimer = setTimeout(() => { if (state.confirm === key) { state.confirm = null; refresh(); } }, 4000);
  refresh();
  return false;
}
const armed = key => state.confirm === key;
/** Ridisegna la vista attiva e, se aperto, il selettore esercizi. */
function refresh() { render(); renderSheet(); }

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
  const repeatBtn = (planId, src, label) => src
    ? `<button type="button" class="btn soft" data-action="repeat" data-plan="${esc(planId)}">
        <span>${label}</span><small>${esc(planId ? fmtDateRel(src.date) : `${src.planName}, ${fmtDateRel(src.date)}`)}</small></button>`
    : `<button type="button" class="btn soft" disabled>
        <span>${label}</span><small>Nessun allenamento precedente</small></button>`;
  const plans = state.plans.map(p => `
    <article class="card pick-card">
      <div class="pick-head"><strong>${esc(p.name)}</strong><span class="meta">${plural(p.exercises.length, 'esercizio', 'esercizi')}</span></div>
      <div class="pick-actions">
        <button type="button" class="btn primary" data-action="start" data-plan="${esc(p.id)}"><span>Inizia</span><small>valori della scheda</small></button>
        ${repeatBtn(p.id, lastSessionOfPlan(p.id), 'Ripeti ultimo')}
      </div>
    </article>`).join('');

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
      <article class="card pick-card free">
        <div class="pick-head"><strong>Allenamento libero</strong><span class="meta">Aggiungi gli esercizi mentre ti alleni</span></div>
        <div class="pick-actions">
          <button type="button" class="btn ${state.plans.length ? '' : 'primary'}" data-action="start" data-plan=""><span>Inizia</span><small>vuoto</small></button>
          ${repeatBtn('', last, 'Ripeti ultimo allenamento')}
        </div>
      </article>
    </div>
    ${state.plans.length ? '' : `
      <div class="card empty">
        <h2>Nessuna scheda</h2>
        <p>Crea la tua prima scheda o aggiungi gli esempi dalla sezione Schede.</p>
        <div class="row" style="margin-top:14px"><button type="button" class="btn soft" data-action="tab" data-view="schede">Vai a Schede</button></div>
      </div>`}`;
}

/** Riga "Nota" di un esercizio dell'allenamento: chiusa (testo o "+ Aggiungi nota") o in modifica. */
function noteBlock(ex, i) {
  if (state.noteEdit === i) return `
        <div class="note-edit" data-note-block="${i}">
          <label class="note-label" for="note-${i}">Nota</label>
          <textarea id="note-${i}" class="note-input" data-nfield="note" data-i="${i}" rows="3" maxlength="${Model.NOTE_MAX}"
            placeholder="Es. sedile alla tacca 4, presa stretta…">${esc(ex.note || '')}</textarea>
          <div class="note-actions">
            <span class="muted note-count" id="note-count-${i}">${(ex.note || '').length}/${Model.NOTE_MAX}</span>
            <button type="button" class="btn ghost small danger" data-action="note-clear" data-i="${i}">Cancella nota</button>
          </div>
        </div>`;
  return `
        <button type="button" class="note-line ${ex.note ? '' : 'empty'}" data-note-block="${i}" data-action="note-edit" data-i="${i}" aria-label="${ex.note ? `Nota: ${esc(ex.note)}. Tocca per modificare` : 'Aggiungi nota'}">
          ${ex.note ? `<span class="note-label">Nota</span><span class="note-text">${esc(ex.note)}</span>` : '+ Aggiungi nota'}
        </button>`;
}

/** Sostituisce solo la riga "Nota" (senza ridisegnare: il campo kg toccato resta attivo con la sua tastiera). */
function refreshNoteBlock(i) {
  const el = document.querySelector(`#view-oggi [data-note-block="${i}"]`);
  const ex = state.draft && state.draft.exercises[i];
  if (el && ex) el.outerHTML = noteBlock(ex, i); else render();
}

function renderDraft() {
  const d = state.draft;
  const total = d.exercises.reduce((n, ex) => n + ex.sets.length, 0);
  const done = d.exercises.reduce((n, ex) => n + ex.sets.filter(s => s.done).length, 0);
  const pending = total - done;

  const exercises = d.exercises.map((ex, i) => {
    const last = lastPerformance(exKey(ex));
    const rows = ex.sets.map((s, j) => `
      <div class="set-row ${s.done ? 'done' : ''}" data-i="${i}" data-j="${j}">
        <span class="set-n">${j + 1}</span>
        <div class="kg-cell">
          <button type="button" class="step-btn step-minus" data-action="kg-step" data-dir="-1" aria-label="Serie ${j + 1}: togli ${fmt(state.settings.weightStep, 2)} kg">−</button>
          <input type="text" inputmode="decimal" autocomplete="off" enterkeyhint="next" aria-label="Serie ${j + 1}, kg" data-field="kg" value="${esc(s.kg)}" placeholder="kg">
          <button type="button" class="step-btn step-plus" data-action="kg-step" data-dir="1" aria-label="Serie ${j + 1}: aggiungi ${fmt(state.settings.weightStep, 2)} kg">+</button>
        </div>
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
        ${noteBlock(ex, i)}
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
        ${(tm => `
        <div class="ex-timer-row">
          <label class="switch-row">
            <span class="rest-label">${ICON.timer} Timer esercizio</span>
            <input type="checkbox" role="switch" class="switch" data-dfield="timer-enabled" data-i="${i}" ${tm.enabled ? 'checked' : ''}
              aria-label="Timer per ${esc(ex.name)}, solo in questo allenamento">
          </label>
          ${tm.enabled ? `
          <label class="field timer-seconds"><span>Durata (secondi)</span>
            <input type="text" inputmode="numeric" autocomplete="off" enterkeyhint="done" data-dfield="timer-seconds" data-i="${i}" value="${tm.seconds}"></label>` : ''}
        </div>`)(Model.cleanTimer(ex.timer))}
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
    <button type="button" class="btn soft block" data-action="picker-open" data-mode="draft">+ Aggiungi esercizio</button>
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

/* ---------- Copia automatica del peso alle serie successive ---------- */
/** Stesso peso? Vuoto = vuoto; "62,5" = "62.5"; confronto al centesimo. */
function sameKg(a, b) {
  const ea = String(a ?? '').trim() === '', eb = String(b ?? '').trim() === '';
  if (ea || eb) return ea && eb;
  const x = toNum(a), y = toNum(b);
  return Number.isFinite(x) && Number.isFinite(y) && Math.round(x * 100) === Math.round(y * 100);
}

/**
 * Il peso della serie j è passato da oldKg a newKg: lo copio nelle serie successive
 * ancora da fare che avevano lo stesso vecchio peso (piramidi e riscaldamento restano).
 * Solo l'allenamento in corso; restituisce gli indici delle serie cambiate.
 */
function copyKgForward(i, j, oldKg, newKg) {
  const ex = state.draft && state.draft.exercises[i];
  if (!ex || !state.settings.copyWeight || sameKg(oldKg, newKg) || !Number.isFinite(toNum(newKg))) return [];
  const changed = [];
  for (let k = j + 1; k < ex.sets.length; k++) {
    const set = ex.sets[k];
    if (!set.done && sameKg(set.kg, oldKg)) { set.kg = newKg; changed.push(k); }
  }
  return changed;
}

/** Aggiorna i campi delle serie copiate e le fa lampeggiare (mezzo secondo). */
function showCopiedKg(i, changed) {
  for (const k of changed) {
    const input = document.querySelector(`#view-oggi .set-row[data-i="${i}"][data-j="${k}"] [data-field="kg"]`);
    if (!input) continue;
    input.value = state.draft.exercises[i].sets[k].kg;
    input.classList.remove('kg-flash');
    void input.offsetWidth;            // riavvia l'animazione se già in corso
    input.classList.add('kg-flash');
    setTimeout(() => input.classList.remove('kg-flash'), 600);
  }
}

/** Serie previste di una scheda -> serie dell'allenamento in corso (stringhe, non fatte). */
function planSetsToDraft(sets) {
  return sets.map(s => ({ kg: fmtKgInput(s.weight), reps: s.reps ? String(s.reps) : '', done: false }));
}

/** Crea l'allenamento in corso: id nuovo, data di oggi, nessuna serie fatta. */
function beginDraft({ planId, planName, exercises }) {
  state.draft = {
    id: uid(),
    date: todayStr(),
    planId,
    planName,
    createdAt: new Date().toISOString(),
    exercises,
    timer: null,
  };
  state.summary = null;
  saveDraft();
  showView('oggi');
  window.scrollTo(0, 0);
}

function startWorkout(planId) {
  if (state.draft) return toast('C\'è già un allenamento in corso.');
  const plan = state.plans.find(p => p.id === planId);
  beginDraft({
    planId: plan ? plan.id : null,
    planName: plan ? plan.name : 'Allenamento libero',
    exercises: plan ? plan.exercises.map(ex => ({
      ...(ex.exerciseId ? { exerciseId: ex.exerciseId } : {}),
      name: ex.name,
      note: lastNote(exKey(ex)),
      rest: restOf(ex),
      timer: Model.cleanTimer(ex.timer),
      sets: planSetsToDraft(ex.sets),
    })) : [],
  });
}

/** Ultima sessione registrata con una scheda (per data, poi per ora di salvataggio). */
function lastSessionOfPlan(planId) {
  return sortedSessions().find(s => s.planId === planId && s.exercises.length) || null;
}

/**
 * "Ripeti ultimo": copia esercizi e serie (kg e ripetizioni effettivamente fatti)
 * dell'ultima sessione della scheda, oppure dell'ultima in assoluto se planId è vuoto.
 * Id e data NON vengono copiati: l'allenamento nuovo è di oggi. Recupero e timer
 * vengono dalla scheda, perché le sessioni registrate non li contengono.
 */
function repeatWorkout(planId) {
  if (state.draft) return toast('C\'è già un allenamento in corso.');
  const src = planId ? lastSessionOfPlan(planId) : sortedSessions()[0];
  if (!src) return toast('Nessun allenamento precedente.');
  const plan = state.plans.find(p => p.id === (planId || src.planId)) || null;
  const planExercise = key => (plan && plan.exercises.find(e => exKey(e) === key))
    || state.plans.flatMap(p => p.exercises).find(e => exKey(e) === key) || null;
  beginDraft({
    planId: plan ? plan.id : null,
    planName: plan ? plan.name : src.planName,
    exercises: src.exercises.filter(ex => ex.sets.length).map(ex => {
      const pe = planExercise(exKey(ex));
      return {
        ...(ex.exerciseId ? { exerciseId: ex.exerciseId } : {}),
        name: ex.name,
        note: lastNote(exKey(ex)),
        rest: restOf(pe),
        timer: Model.cleanTimer(pe && pe.timer),
        sets: ex.sets.map(set => ({ kg: fmtKgInput(set.kg), reps: String(set.reps), done: false })),
      };
    }),
  });
  toast(`Ripeti: ${src.planName} di ${fmtDateRel(src.date)}.`);
}

/** Aggiunge all'allenamento in corso un esercizio scelto dal selettore. */
function addDraftExercise(info, timerChoice) {
  const key = info.id;
  const last = lastPerformance(key);
  const fromPlan = state.plans.flatMap(p => p.exercises).find(e => e.exerciseId === key);
  let sets;
  if (last) sets = last.sets.map(s => ({ kg: fmtKgInput(s.kg), reps: String(s.reps), done: false }));
  else if (fromPlan) sets = planSetsToDraft(fromPlan.sets);
  else sets = Array.from({ length: 3 }, () => ({ kg: '', reps: info.timed ? '1' : '', done: false }));
  const timer = timerChoice ? Model.cleanTimer(timerChoice) : defaultTimer(info, fromPlan);
  state.draft.exercises.push({ exerciseId: info.id, name: info.name, note: lastNote(key), rest: restOf(fromPlan), timer, sets });
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
      ...(ex.exerciseId ? { exerciseId: ex.exerciseId } : {}),
      name: ex.name.trim(),
      note: Model.cleanNote(ex.note).trim(),
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
    const prev = previousMax(exKey(ex));
    const max = Math.max(...ex.sets.map(s => s.kg));
    if (prev && max > prev.max && !records.some(r => r.key === exKey(ex))) records.push({ key: exKey(ex), name: ex.name, max, prev: prev.max });
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
    <button type="button" class="btn block" data-action="picker-open" data-mode="browse">Libreria esercizi</button>
    ${cards || `<div class="card empty"><h2>Nessuna scheda</h2><p>Crea una scheda oppure aggiungi gli esempi Push, Pull e Gambe.</p></div>`}`;
}

function renderEditor() {
  const e = state.editor;
  const rows = e.exercises.map((ex, k) => `
    <div class="ed-ex">
      <div class="top">
        <div class="ed-ex-name"><span class="muted">Esercizio ${k + 1}</span>
          <strong>${esc(ex.name)}</strong>
          ${(info => info ? `<span class="muted">${esc([info.bodyPart, info.equipment].filter(Boolean).join(' · '))}</span>` : '')(exerciseInfo(ex.exerciseId))}</div>
        <button type="button" class="icon-btn" data-action="ed-remove-ex" data-k="${k}" aria-label="Rimuovi ${esc(ex.name)}">${ICON.close}</button>
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
      ${rows || '<p class="muted">Nessun esercizio: aggiungili dalla libreria.</p>'}
      <button type="button" class="btn soft" data-action="picker-open" data-mode="plan">+ Esercizio</button>
    </form>
    <div class="row">
      <button type="button" class="btn" data-action="ed-cancel">Annulla</button>
      <button type="button" class="btn primary" data-action="ed-save">Salva scheda</button>
    </div>`;
}

/** Esercizio nuovo per l'editor, scelto dalla libreria: se è a tempo il timer parte acceso (30 s). */
const editorExerciseFrom = (info, timerChoice) => ({
  id: uid(), exerciseId: info.id, name: info.name, rest: Model.REST.default,
  timer: (tm => ({ enabled: tm.enabled, seconds: String(tm.seconds) }))(timerChoice ? Model.cleanTimer(timerChoice) : defaultTimer(info)),
  sets: Array.from({ length: 3 }, () => ({ reps: info.timed ? '1' : '10', weight: '' })),
});

function openEditor(planId) {
  const p = state.plans.find(x => x.id === planId);
  state.editor = p
    ? { id: p.id, name: p.name, exercises: p.exercises.map(ex => ({
        id: ex.id || uid(), exerciseId: ex.exerciseId, name: ex.name, rest: restOf(ex),
        timer: (tm => ({ enabled: tm.enabled, seconds: String(tm.seconds) }))(Model.cleanTimer(ex.timer)),
        sets: ex.sets.map(s => ({ reps: String(s.reps), weight: fmtKgInput(s.weight) })),
      })) }
    : { id: null, name: '', exercises: [] };
  render();
  window.scrollTo(0, 0);
}

async function saveEditor() {
  const e = state.editor;
  const name = e.name.trim();
  if (!name) return toast('Dai un nome alla scheda.');
  const exercises = e.exercises
    .filter(ex => ex.name.trim())
    .map(ex => Model.migratePlanExercise({ id: ex.id, exerciseId: ex.exerciseId, name: ex.name, sets: ex.sets, rest: ex.rest, timer: ex.timer })); // pulisce i valori (rip ≥ 1, kg ≥ 0)
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
  if (!state.library) return toast('La libreria esercizi non è disponibile: riprova con la connessione.');
  const existing = new Set(state.plans.map(p => norm(p.name)));
  const toAdd = EXAMPLE_PLANS.filter(p => !existing.has(norm(p.name))).map(p => ({
    id: uid(),
    name: p.name,
    exercises: p.exercises.map(([exerciseId, sets, opt = {}]) => Model.migratePlanExercise({
      id: uid(), exerciseId, name: exerciseInfo(exerciseId).name, sets: sets.map(([reps, weight]) => ({ reps, weight })),
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
   SELETTORE ESERCIZI E LIBRERIA (foglio a tutto schermo)
   mode: 'plan' (editor scheda), 'draft' (allenamento in corso), 'browse' (solo consultazione)
   ========================================================================= */
const PICKER_TITLES = { plan: 'Aggiungi esercizio', draft: 'Aggiungi esercizio', browse: 'Libreria esercizi' };
const ICON_MEDIA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6M6 6v12M18 6v12M21 9v6M6 12h12"/></svg>';

function openPicker(mode) {
  state.picker = { mode, query: '', part: '', equip: '', detail: null, form: null, listScroll: 0 };
  renderSheet();
  $('#sheet').scrollTop = 0;
}

function closePicker() {
  state.picker = null;
  state.confirm = null;
  renderSheet();
}

/** Ricerca senza accenti su nome e alias (tutte le parole devono comparire), più i filtri. */
function pickerMatches() {
  const { query, part, equip } = state.picker;
  const words = query.split(/\s+/).map(fold).filter(Boolean);
  return allExercises()
    .filter(e => (!part || e.bodyPart === part) && (!equip || e.equipment === equip))
    .filter(e => !words.length || words.every(w => [e.name, ...(e.aliases || [])].some(label => fold(label).includes(w))))
    .sort((a, b) => a.name.localeCompare(b.name, 'it'));
}

function renderSheet() {
  const el = $('#sheet');
  const p = state.picker;
  document.body.classList.toggle('sheet-open', !!p);
  if (!p) { el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  el.innerHTML = p.form ? renderCustomForm() : p.detail ? renderExerciseDetail() : renderPickerList();
}

const sheetHead = (left, title) => `
  <header class="sheet-head">
    ${left}
    <button type="button" class="icon-btn" data-action="picker-close" aria-label="Chiudi">${ICON.close}</button>
  </header>
  ${title ? `<h2 id="sheet-title">${esc(title)}</h2>` : ''}`;

function renderPickerList() {
  const p = state.picker;
  const parts = Model.BODY_PARTS;
  return `
    <div class="sheet-inner">
      ${sheetHead('<span></span>', PICKER_TITLES[p.mode])}
      <input type="search" class="picker-search" data-field="picker-query" value="${esc(p.query)}"
        placeholder="Cerca (es. panca, squat, bench press)" aria-label="Cerca esercizio" autocomplete="off" enterkeyhint="search">
      <div class="chips" role="group" aria-label="Parte del corpo">
        ${['', ...parts].map(v => `<button type="button" class="chip" data-action="picker-part" data-part="${esc(v)}" aria-pressed="${p.part === v}">${esc(v || 'Tutte')}</button>`).join('')}
      </div>
      <label class="field"><span>Attrezzo</span>
        <select data-field="picker-equip">
          <option value="">Tutti gli attrezzi</option>
          ${Model.EQUIPMENT.map(v => `<option value="${esc(v)}" ${p.equip === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}
        </select></label>
      ${state.library ? '' : '<p class="warn-box">La libreria non è disponibile in questo momento: compaiono solo i tuoi esercizi personalizzati.</p>'}
      <div id="picker-results">${renderPickerResults()}</div>
      <button type="button" class="btn block" data-action="custom-new">+ Crea esercizio personalizzato</button>
    </div>`;
}

function renderPickerResults() {
  const list = pickerMatches();
  if (!list.length) return '<p class="muted picker-count">Nessun esercizio trovato.</p>';
  return `
    <p class="muted picker-count">${plural(list.length, 'esercizio', 'esercizi')}</p>
    <ul class="pick-list">${list.map(e => `
      <li><button type="button" class="pick-item" data-action="picker-detail" data-id="${esc(e.id)}">
        <span class="pi-main"><strong>${esc(e.name)}</strong>
          <span class="meta">${esc([e.bodyPart, e.equipment, e.timed ? 'a tempo' : '', Model.isCustomId(e.id) ? 'personalizzato' : ''].filter(Boolean).join(' · '))}</span></span>
        <span class="pi-chev" aria-hidden="true">›</span>
      </button></li>`).join('')}
    </ul>`;
}

function renderExerciseDetail() {
  const p = state.picker;
  const e = exerciseInfo(p.detail);
  if (!e) { p.detail = null; return renderPickerList(); }
  const custom = Model.isCustomId(e.id);
  const rec = previousMax(e.id);
  const last = lastPerformance(e.id);
  const delKey = `cx-${e.id}`;
  const listOrDash = arr => arr && arr.length ? esc(arr.join(', ')) : '–';
  return `
    <div class="sheet-inner">
      ${sheetHead('<button type="button" class="btn ghost small" data-action="picker-back">‹ Elenco</button>', '')}
      <div class="ex-media" aria-hidden="true">${ICON_MEDIA}</div>
      <h2 id="sheet-title">${esc(e.name)}</h2>
      ${e.aliases && e.aliases.length ? `<p class="muted">Anche: ${esc(e.aliases.join(', '))}</p>` : ''}
      <div class="tags">
        ${e.bodyPart ? `<span class="tag">${esc(e.bodyPart)}</span>` : ''}
        <span class="tag">${esc(e.equipment)}</span>
        ${e.timed ? '<span class="tag">A tempo</span>' : ''}
        ${custom ? '<span class="tag custom">Personalizzato</span>' : ''}
      </div>
      <dl class="ex-facts">
        <dt>Muscoli principali</dt><dd>${listOrDash(e.muscles)}</dd>
        <dt>Muscoli secondari</dt><dd>${listOrDash(e.secondary)}</dd>
      </dl>
      ${e.instructions ? `<h3>Esecuzione</h3><p class="ex-instructions">${esc(e.instructions)}</p>` : ''}
      ${rec || last ? `
      <div class="tiles">
        ${rec ? `<div class="tile record"><div class="label">Il mio record</div><div class="value">${fmt(rec.max, 2)}<small>kg</small></div><div class="hint">${esc(fmtDateRel(rec.date))}</div></div>` : ''}
        ${last ? `<div class="tile"><div class="label">Ultima volta</div><div class="value small-value">${esc(fmtDateRel(last.date))}</div><div class="hint num">${esc(setsText(last.sets))}</div></div>` : ''}
      </div>` : ''}
      ${p.mode !== 'browse' && p.timer ? `
      <div class="card picker-timer">
        <label class="switch-row">
          <span class="rest-label">${ICON.timer} Timer</span>
          <input type="checkbox" role="switch" class="switch" data-pfield="timer-enabled" ${p.timer.enabled ? 'checked' : ''} aria-label="Timer per ${esc(e.name)}">
        </label>
        ${p.timer.enabled ? `
        <label class="field timer-seconds"><span>Durata (secondi)</span>
          <input type="text" inputmode="numeric" autocomplete="off" data-pfield="timer-seconds" value="${esc(p.timer.seconds)}"></label>` : ''}
      </div>` : ''}
      ${p.mode !== 'browse' ? `<button type="button" class="btn primary big block" data-action="picker-add" data-id="${esc(e.id)}">Aggiungi</button>` : ''}
      ${custom ? `
      <div class="row">
        <button type="button" class="btn" data-action="custom-edit" data-id="${esc(e.id)}">Modifica</button>
        <button type="button" class="btn danger ${armed(delKey) ? 'armed' : ''}" data-action="custom-delete" data-id="${esc(e.id)}">${armed(delKey) ? 'Tocca ancora per eliminare' : 'Elimina'}</button>
      </div>
      <p class="muted small-note">Eliminarlo non cambia gli allenamenti già registrati.</p>` : ''}
    </div>`;
}

function renderCustomForm() {
  const f = state.picker.form;
  return `
    <div class="sheet-inner">
      ${sheetHead('<button type="button" class="btn ghost small" data-action="custom-cancel">‹ Indietro</button>', f.id ? 'Modifica esercizio' : 'Nuovo esercizio personalizzato')}
      <form class="custom-form" data-form="custom-ex" autocomplete="off">
        <label class="field"><span>Nome</span>
          <input type="text" data-cfield="name" value="${esc(f.name)}" maxlength="80" required placeholder="Es. Spinte alla macchina convergente"></label>
        <label class="field"><span>Parte del corpo</span>
          <select data-cfield="bodyPart"><option value="">–</option>
            ${Model.BODY_PARTS.map(v => `<option value="${esc(v)}" ${f.bodyPart === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
        <label class="field"><span>Attrezzo</span>
          <select data-cfield="equipment">
            ${Model.EQUIPMENT.map(v => `<option value="${esc(v)}" ${f.equipment === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
        <label class="field"><span>Muscoli principali (separati da virgola)</span>
          <input type="text" data-cfield="muscles" value="${esc(f.muscles)}" placeholder="Es. Grande pettorale, Tricipite"></label>
        <label class="field"><span>Istruzioni</span>
          <textarea data-cfield="instructions" rows="3" maxlength="1000" placeholder="Come si esegue, in 2-3 frasi">${esc(f.instructions)}</textarea></label>
        <label class="switch-row"><span>Esercizio a tempo (plank, isometrie)</span>
          <input type="checkbox" role="switch" class="switch" data-cfield="timed" ${f.timed ? 'checked' : ''}></label>
        <button type="submit" class="btn primary big block">${f.id ? 'Salva modifiche' : 'Crea esercizio'}</button>
      </form>
    </div>`;
}

function openCustomForm(id) {
  const c = id ? state.customExercises.find(x => x.id === id) : null;
  state.picker.form = c
    ? { id: c.id, name: c.name, bodyPart: c.bodyPart, equipment: c.equipment, muscles: c.muscles.join(', '), instructions: c.instructions, timed: c.timed }
    : { id: null, name: state.picker.query.trim(), bodyPart: state.picker.part, equipment: state.picker.equip || 'altro', muscles: '', instructions: '', timed: false };
  renderSheet();
  $('#sheet').scrollTop = 0;
}

async function saveCustomForm() {
  const p = state.picker;
  const f = p.form;
  const name = String(f.name || '').trim();
  if (!name) return toast('Dai un nome all\'esercizio.');
  const clash = allExercises().find(e => e.id !== f.id && [e.name, ...(e.aliases || [])].some(label => fold(label) === fold(name)));
  if (clash) {
    toast(`Esiste già: ${clash.name}.`);
    p.form = null; p.detail = clash.id;
    return renderSheet();
  }
  const existing = f.id ? state.customExercises.find(x => x.id === f.id) : {};
  const c = Model.cleanCustomExercise({ ...existing, ...f, id: f.id || undefined, name }, new Set(state.customExercises.map(x => x.id)));
  let list;
  if (f.id) {
    list = state.customExercises.map(x => x.id === f.id ? c : x);
    // Il nome nuovo vale per schede e allenamento in corso; lo storico resta com'era.
    const plans = state.plans.map(pl => ({ ...pl, exercises: pl.exercises.map(ex => ex.exerciseId === c.id ? { ...ex, name: c.name } : ex) }));
    await Store.savePlans(plans);
    state.plans = plans;
    if (state.draft) { state.draft.exercises.forEach(ex => { if (ex.exerciseId === c.id) ex.name = c.name; }); saveDraft(); }
    if (state.editor) state.editor.exercises.forEach(ex => { if (ex.exerciseId === c.id) ex.name = c.name; });
  } else {
    list = [...state.customExercises, c];
  }
  await Store.saveCustomExercises(list);
  state.customExercises = list;
  p.form = null;
  if (!f.id && p.mode !== 'browse') return pickExercise(c.id);
  p.detail = c.id;
  toast(f.id ? 'Esercizio aggiornato.' : 'Esercizio creato.');
  refresh();
}

async function deleteCustomExercise(id) {
  const list = state.customExercises.filter(c => c.id !== id);
  await Store.saveCustomExercises(list);
  state.customExercises = list;
  state.picker.detail = null;
  toast('Esercizio eliminato. Lo storico resta invariato.');
  refresh();
}

/** Aggiunge l'esercizio scelto all'editor della scheda o all'allenamento in corso. */
function pickExercise(id) {
  const info = exerciseInfo(id);
  if (!info || !state.picker) return;
  const mode = state.picker.mode;
  // Timer scelto nel dettaglio (assente se l'esercizio è stato appena creato: valori iniziali)
  const timerChoice = state.picker.detail === id && state.picker.timer
    ? { enabled: state.picker.timer.enabled, seconds: typedSeconds(state.picker.timer.seconds) } : null;
  closePicker();
  if (mode === 'plan' && state.editor) {
    state.editor.exercises.push(editorExerciseFrom(info, timerChoice));
    render();
    [...document.querySelectorAll('#view-schede .ed-ex')].pop()?.scrollIntoView({ block: 'center' });
  } else if (mode === 'draft' && state.draft) {
    addDraftExercise(info, timerChoice);
    [...document.querySelectorAll('#view-oggi article.card')].pop()?.scrollIntoView({ block: 'start' });
  }
  toast(`Aggiunto: ${info.name}.`);
}

/* =========================================================================
   VISTA: PROGRESSI
   ========================================================================= */
const METRICS = {
  max: { label: 'Peso max', key: 'max', unit: 'kg' },
  orm: { label: '1RM stimato', key: 'orm', unit: 'kg' },
  volume: { label: 'Volume', key: 'volume', unit: 'kg' },
};

const chartWidth = () => Math.max(240, Math.min(608, ($('#view-progressi').clientWidth || 340) - 30));

function renderProgressi() {
  const mode = state.progress.mode;
  return `
    <header class="view-head"><h1>Progressi</h1></header>
    <div class="segmented two" role="group" aria-label="Cosa mostrare">
      <button type="button" data-action="progress-mode" data-mode="exercises" aria-pressed="${mode === 'exercises'}">Esercizi</button>
      <button type="button" data-action="progress-mode" data-mode="body" aria-pressed="${mode === 'body'}">Peso corporeo</button>
    </div>
    ${mode === 'body' ? renderBodyWeight() : renderExerciseProgress()}`;
}

function renderExerciseProgress() {
  const known = knownExercises({ withHistoryOnly: true });
  if (!known.length) {
    return `
      <div class="card empty"><h2>Ancora nessun dato</h2><p>Termina il primo allenamento e qui vedrai grafici e record per ogni esercizio.</p></div>`;
  }
  if (!known.some(k => k.key === state.progress.exercise)) state.progress.exercise = known[0].key;

  const metric = METRICS[state.progress.metric];
  const hist = exerciseHistory(state.progress.exercise);
  const first = hist[0], lastH = hist[hist.length - 1];
  const bestMax = Math.max(...hist.map(h => h.max));
  const bestMaxDate = hist.find(h => h.max === bestMax).date;
  const bestOrm = Math.max(...hist.map(h => h.orm));
  const delta = lastH[metric.key] - first[metric.key];
  const deltaPct = first[metric.key] > 0 ? (delta / first[metric.key]) * 100 : null;
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '';

  const points = hist.map(h => ({ date: h.date, v: h[metric.key] }));

  return `
    <label class="field"><span>Esercizio</span>
      <select data-field="progress-ex">${known.map(k => `<option value="${esc(k.key)}" ${k.key === state.progress.exercise ? 'selected' : ''}>${esc(k.name)}</option>`).join('')}</select>
    </label>
    <div class="segmented" role="group" aria-label="Metrica">
      ${Object.entries(METRICS).map(([k, m]) => `<button type="button" data-action="metric" data-metric="${k}" aria-pressed="${k === state.progress.metric}">${m.label}</button>`).join('')}
    </div>
    <article class="card">
      <div class="chart-wrap">${chartSVG(points, chartWidth(), metric)}</div>
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
          <div class="main"><strong>${esc(fmtDateRel(h.date))}</strong>${h.note ? ` <span class="hist-note">${esc(h.note)}</span>` : ''} <span class="muted">· ${esc(h.planName)}</span>
            <div class="sets-txt num">${esc(setsText(h.sets))}</div></div>
          <div class="right">${fmt(h[metric.key], metric.key === 'volume' ? 0 : 1)} <small class="muted">kg</small></div>
        </div>`).join('')}
    </article>`;
}

/* ---------- Peso corporeo ---------- */
const BODY_RANGES = { 30: '1 mese', 90: '3 mesi', all: 'Tutto' };
const signed = (n, dec = 1) => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${fmt(Math.abs(n), dec)}`;

function renderBodyWeight() {
  const list = state.bodyWeights;                  // in ordine di data
  const form = state.bodyForm;
  const formDate = form.date || todayStr();
  const existing = list.find(w => w.date === formDate);
  const last = list[list.length - 1];

  const formHtml = `
    <form class="card body-form" data-form="body-weight" autocomplete="off">
      <h2>Registra il peso</h2>
      <div class="body-form-row">
        <label class="field"><span>Data</span>
          <input type="date" data-bfield="date" value="${esc(formDate)}" max="${todayStr()}" required></label>
        <label class="field"><span>Peso (kg)</span>
          <input type="text" inputmode="decimal" data-bfield="kg" value="${esc(form.kg)}" placeholder="${last ? esc(fmtKgInput(last.kg)) : 'es. 78,5'}" enterkeyhint="done"></label>
      </div>
      ${existing ? `<p class="muted body-note">Per questa data c'è già <strong class="num">${fmt(existing.kg, 2)} kg</strong>: il nuovo valore lo sostituisce.</p>` : ''}
      <button type="submit" class="btn primary block">${existing ? 'Aggiorna peso' : 'Salva peso'}</button>
    </form>`;

  if (!list.length) {
    return `${formHtml}
      <div class="card empty"><h2>Nessuna registrazione</h2><p>Pesati sempre nelle stesse condizioni (per esempio al mattino, a digiuno) per un andamento affidabile.</p></div>`;
  }

  const range = state.progress.range;
  const from = range === 'all' ? '' : daysAgoStr(Number(range));
  const inRange = list.filter(w => w.date >= from);
  const lastWeek = list.filter(w => w.date > daysAgoStr(7));
  const avg7 = lastWeek.length ? lastWeek.reduce((a, w) => a + w.kg, 0) / lastWeek.length : null;
  const first = inRange[0], lastIn = inRange[inRange.length - 1];
  const delta = inRange.length > 1 ? lastIn.kg - first.kg : null;
  const kgs = inRange.map(w => w.kg);

  const newestFirst = [...list].reverse();
  const shown = state.bodyShowAll ? newestFirst : newestFirst.slice(0, 10);
  const rows = shown.map(w => {
    const prev = list[list.indexOf(w) - 1];
    const delKey = `bw-${w.id}`;
    return `
      <div class="list-item bw-item">
        <div class="main"><strong>${esc(fmtDateRel(w.date))}</strong>
          ${prev ? `<div class="sets-txt num">${signed(w.kg - prev.kg)} kg dalla precedente</div>` : ''}</div>
        <div class="right">${fmt(w.kg, 2)} <small class="muted">kg</small></div>
        <button type="button" class="icon-btn ${armed(delKey) ? 'armed' : ''}" data-action="bw-delete" data-id="${esc(w.id)}" aria-label="Elimina il peso del ${esc(fmtDate(w.date))}">
          ${armed(delKey) ? 'Elimina?' : ICON.close}</button>
      </div>`;
  }).join('');

  return `${formHtml}
    <div class="segmented" role="group" aria-label="Periodo">
      ${Object.entries(BODY_RANGES).map(([k, label]) => `<button type="button" data-action="bw-range" data-range="${k}" aria-pressed="${k === range}">${label}</button>`).join('')}
    </div>
    <article class="card">
      ${inRange.length
        ? `<div class="chart-wrap">${chartSVG(inRange.map(w => ({ date: w.date, v: w.kg })), chartWidth(), { label: 'Peso corporeo', unit: 'kg' }, { timeScale: true, highlightBest: false, per: 'nel tempo' })}</div>`
        : '<p class="muted empty">Nessuna registrazione in questo periodo.</p>'}
    </article>
    <div class="tiles">
      <div class="tile"><div class="label">Attuale</div><div class="value">${fmt(last.kg, 1)}<small>kg</small></div><div class="hint">${esc(fmtDateRel(last.date))}</div></div>
      <div class="tile"><div class="label">Variazione</div><div class="value">${delta !== null ? `${signed(delta)}<small>kg</small>` : '–'}</div>
        <div class="hint">${delta !== null ? `dal ${esc(fmtDate(first.date, { day: 'numeric', month: 'short' }))}` : 'servono 2 registrazioni'}</div></div>
      <div class="tile"><div class="label">Media 7 giorni</div><div class="value">${avg7 !== null ? `${fmt(avg7, 1)}<small>kg</small>` : '–'}</div>
        <div class="hint">${avg7 !== null ? plural(lastWeek.length, 'registrazione', 'registrazioni') : 'nessuna questa settimana'}</div></div>
      <div class="tile"><div class="label">Min – max</div><div class="value">${kgs.length ? `${fmt(Math.min(...kgs), 1)}–${fmt(Math.max(...kgs), 1)}` : '–'}</div>
        <div class="hint">${esc(BODY_RANGES[range].toLowerCase())}</div></div>
    </div>
    <h2 class="section-title">Registrazioni</h2>
    <article class="card list">${rows}</article>
    ${list.length > 10 ? `<button type="button" class="btn ghost block" data-action="bw-show-all">${state.bodyShowAll ? 'Mostra meno' : `Mostra tutte (${list.length})`}</button>` : ''}`;
}

async function saveBodyWeightFromForm() {
  const date = state.bodyForm.date || todayStr();
  const kg = toNum(state.bodyForm.kg);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > todayStr()) return toast('Scegli una data valida (non nel futuro).');
  if (!Model.validBodyKg(kg)) return toast(`Inserisci un peso tra ${Model.BODY_WEIGHT.min} e ${Model.BODY_WEIGHT.max} kg.`);
  const existing = state.bodyWeights.find(w => w.date === date);
  const entry = Model.cleanBodyWeight({ id: existing ? existing.id : uid(), date, kg, createdAt: new Date().toISOString() });
  await Store.saveBodyWeight(entry);
  state.bodyWeights = Model.cleanBodyWeights([...state.bodyWeights.filter(w => w.date !== date), entry]);
  state.bodyForm = { date: '', kg: '' };
  toast(existing ? 'Peso aggiornato.' : 'Peso salvato.');
  render();
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

/**
 * Grafico a linea in SVG, disegnato a mano.
 * opts.timeScale: posizione orizzontale proporzionale alla data (registrazioni irregolari)
 * opts.highlightBest: evidenzia in ambra il valore massimo (record)
 */
function chartSVG(points, W, metric, opts = {}) {
  const { timeScale = false, highlightBest = true, per = 'per sessione' } = opts;
  const H = 220, pl = 46, pr = 16, pt = 22, pb = 30;
  const vals = points.map(p => p.v);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (min === max) { const pad = max === 0 ? 1 : Math.abs(max) * 0.1; min = Math.max(0, min - pad); max += pad; }
  const { lo, hi, ticks } = niceScale(min, max, 4);
  const iw = W - pl - pr, ih = H - pt - pb;
  const times = points.map(p => parseDate(p.date).getTime());
  const t0 = times[0], t1 = times[times.length - 1];
  const x = i => points.length === 1 ? pl + iw / 2
    : timeScale ? (t1 === t0 ? pl + iw / 2 : pl + ((times[i] - t0) * iw) / (t1 - t0))
    : pl + (i * iw) / (points.length - 1);
  const y = v => pt + ((hi - v) * ih) / (hi - lo);

  const grid = ticks.map(t => `
    <line class="grid" x1="${pl}" x2="${W - pr}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"/>
    <text class="axis-label" x="${pl - 8}" y="${(y(t) + 4).toFixed(1)}" text-anchor="end">${fmt(t, 1)}</text>`).join('');

  // Etichette date: al massimo 4, distribuite, senza sovrapporsi (almeno 64 px tra una e l'altra).
  const n = points.length;
  const candidates = n <= 4 ? points.map((_, i) => i) : [0, Math.round((n - 1) / 3), Math.round((2 * (n - 1)) / 3), n - 1];
  const labelIdx = [];
  for (const i of [...new Set(candidates)]) {
    const prev = labelIdx[labelIdx.length - 1];
    if (prev === undefined || x(i) - x(prev) >= 64) labelIdx.push(i);
    else if (i === n - 1 && labelIdx.length > 1) labelIdx[labelIdx.length - 1] = i; // l'ultima data vale più di una intermedia
  }
  const xLabels = labelIdx.map(i => {
    const anchor = n === 1 ? 'middle' : i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle';
    return `<text class="axis-label" x="${x(i).toFixed(1)}" y="${H - 8}" text-anchor="${anchor}">${esc(fmtDate(points[i].date, { day: 'numeric', month: 'short' }))}</text>`;
  }).join('');

  const coords = points.map((p, i) => [x(i), y(p.v)]);
  const line = coords.map(([cx, cy], i) => `${i ? 'L' : 'M'}${cx.toFixed(1)},${cy.toFixed(1)}`).join(' ');
  const area = n > 1 ? `${line} L${coords[n - 1][0].toFixed(1)},${(pt + ih).toFixed(1)} L${coords[0][0].toFixed(1)},${(pt + ih).toFixed(1)} Z` : '';
  const bestIdx = highlightBest ? vals.lastIndexOf(Math.max(...vals)) : -1;
  const dots = coords.map(([cx, cy], i) => `
    <circle class="dot ${i === bestIdx ? 'best' : ''}" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${n > 40 ? 3 : 4.5}">
      <title>${esc(fmtDate(points[i].date))}: ${fmt(points[i].v, 1)} ${metric.unit}</title></circle>`).join('');
  const [lx, ly] = coords[n - 1];
  const lastLabel = `<text class="value-label" x="${lx.toFixed(1)}" y="${(ly - 10).toFixed(1)}" text-anchor="${n === 1 ? 'middle' : 'end'}">${fmt(points[n - 1].v, 1)}</text>`;

  return `
    <svg class="chart" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img"
      aria-label="${esc(metric.label)} ${per}, ${n} ${n === 1 ? 'punto' : 'punti'}, ultimo valore ${fmt(points[n - 1].v, 1)} kg">
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
                  <tr${ex.note ? ' class="has-note"' : ''}><td>${esc(ex.name)}</td><td class="sets-col num">${esc(setsText(ex.sets))}</td>
                  <td class="num">${fmt(Math.max(...ex.sets.map(x => x.kg)), 2)}</td></tr>
                  ${ex.note ? `<tr class="note-row"><td colspan="3">${esc(ex.note)}</td></tr>` : ''}`).join('')}</tbody>
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
    <h2 class="section-title">Impostazioni</h2>
    <article class="card settings">
      <div class="setting-row">
        <div><strong>Passo peso (kg)</strong>
          <p class="muted">Quanto cambiano i kg con i pulsanti − e + durante l'allenamento.</p></div>
        <div class="segmented" role="group" aria-label="Passo peso (kg)">
          ${Model.WEIGHT_STEPS.map(v => `<button type="button" data-action="weight-step" data-step="${v}" aria-pressed="${v === state.settings.weightStep}">${fmt(v, 2)}</button>`).join('')}
        </div>
      </div>
      <label class="switch-row setting-switch">
        <span><strong>Copia il peso alle serie successive</strong>
          <span class="muted setting-hint">Cambiando i kg di una serie, le serie seguenti non ancora fatte con lo stesso peso si aggiornano.</span></span>
        <input type="checkbox" role="switch" class="switch" data-sfield="copyWeight" ${state.settings.copyWeight ? 'checked' : ''}>
      </label>
    </article>
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
    libraryVersion: state.library ? state.library.libraryVersion : null,
    exportedAt: new Date().toISOString(),
    plans: state.plans,
    sessions: state.sessions,
    bodyWeights: state.bodyWeights,
    settings: state.settings,
    customExercises: state.customExercises,
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
      ...(ex.exerciseId ? { exerciseId: String(ex.exerciseId) } : {}),
      name: String(ex.name).trim(),
      note: Model.cleanNote(ex.note),
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
  const weightsIn = Model.cleanBodyWeights(data.bodyWeights); // assente nei backup fino alla versione 3
  if (!plansIn.length && !sessionsIn.length && !weightsIn.length) throw new Error('Nel file non ci sono schede, allenamenti né pesi.');

  const plans = new Map(state.plans.map(p => [p.id, p]));
  plansIn.forEach(p => plans.set(p.id, p));
  const sessions = new Map(state.sessions.map(s => [s.id, s]));
  sessionsIn.forEach(s => sessions.set(s.id, s));

  // Peso corporeo: unito per data (a parità di data vince il backup importato)
  const weights = new Map(state.bodyWeights.map(w => [w.date, w]));
  weightsIn.forEach(w => weights.set(w.date, w));

  // Impostazioni: quelle del backup, se presenti (fino alla versione 4 non c'erano)
  const settings = data.settings && typeof data.settings === 'object' ? Model.cleanSettings(data.settings) : state.settings;

  // Esercizi personalizzati: uniti per id. Poi i nomi senza id (backup fino alla v5)
  // vengono collegati come nella migrazione: libreria, personalizzati o nuovi personalizzati.
  const customs = new Map(state.customExercises.map(c => [c.id, c]));
  Model.cleanCustomExercises(data.customExercises).forEach(c => customs.set(c.id, c));
  const linked = Model.linkExercises({ plans: [...plans.values()], sessions: [...sessions.values()], customExercises: [...customs.values()] }, state.library);

  const next = {
    plans: linked.plans, sessions: linked.sessions, customExercises: linked.customExercises,
    bodyWeights: Model.cleanBodyWeights([...weights.values()]), settings,
  };
  await Store.replaceAll(next);
  state.settings = next.settings;
  state.plans = next.plans;
  state.sessions = next.sessions;
  state.bodyWeights = next.bodyWeights;
  state.customExercises = next.customExercises;
  toast(`Importati: ${plural(sessionsIn.length, 'allenamento', 'allenamenti')}, ${plural(plansIn.length, 'scheda', 'schede')}, ${plural(weightsIn.length, 'peso', 'pesi')}.`);
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
  'repeat': el => repeatWorkout(el.dataset.plan),
  'kg-step': el => {
    const row = el.closest('.set-row');
    const set = state.draft.exercises[+row.dataset.i].sets[+row.dataset.j];
    const cur = toNum(set.kg);
    const base = Number.isFinite(cur) && cur > 0 ? cur : 0;
    const oldKg = set.kg;
    set.kg = fmtKgInput(Math.max(0, base + Number(el.dataset.dir) * state.settings.weightStep));
    const input = row.querySelector('[data-field="kg"]');
    input.value = set.kg;
    input.dataset.orig = set.kg;
    showCopiedKg(+row.dataset.i, copyKgForward(+row.dataset.i, +row.dataset.j, oldKg, set.kg));
    saveDraft();
  },
  'weight-step': async el => {
    state.settings = Model.cleanSettings({ ...state.settings, weightStep: Number(el.dataset.step) });
    await Store.saveSettings(state.settings);
    toast(`Passo peso: ${fmt(state.settings.weightStep, 2)} kg.`);
    render();
  },

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
    state.noteEdit = null;
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
  'note-edit': el => {
    const prev = state.noteEdit;
    state.noteEdit = +el.dataset.i;
    if (prev !== null && prev !== state.noteEdit) refreshNoteBlock(prev);
    refreshNoteBlock(state.noteEdit);
    const ta = document.getElementById(`note-${el.dataset.i}`);
    if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
  },
  'note-clear': el => {
    clearTimeout(noteBlurTimer);
    state.draft.exercises[+el.dataset.i].note = '';
    state.noteEdit = null;
    saveDraft(); refreshNoteBlock(+el.dataset.i);
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
  'picker-open': el => openPicker(el.dataset.mode),
  'picker-close': () => closePicker(),
  'picker-part': el => {
    state.picker.part = el.dataset.part;
    document.querySelectorAll('#sheet .chip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.part === state.picker.part)));
    $('#picker-results').innerHTML = renderPickerResults();
  },
  'picker-detail': el => {
    state.picker.listScroll = $('#sheet').scrollTop;
    state.picker.detail = el.dataset.id;
    // Valori iniziali del timer: dalla scheda (se l'esercizio è già in una scheda e stiamo
    // aggiungendo all'allenamento), altrimenti acceso a 30 s solo per gli esercizi "a tempo".
    const info = exerciseInfo(el.dataset.id);
    const fromPlan = state.picker.mode === 'draft' ? state.plans.flatMap(p => p.exercises).find(e => e.exerciseId === el.dataset.id) : null;
    const tm = defaultTimer(info, fromPlan);
    state.picker.timer = { enabled: tm.enabled, seconds: String(tm.seconds) };
    renderSheet();
    $('#sheet').scrollTop = 0;
  },
  'picker-back': () => {
    state.picker.detail = null;
    state.confirm = null;
    renderSheet();
    $('#sheet').scrollTop = state.picker.listScroll || 0;
  },
  'picker-add': el => pickExercise(el.dataset.id),
  'custom-new': () => openCustomForm(null),
  'custom-edit': el => openCustomForm(el.dataset.id),
  'custom-cancel': () => { state.picker.form = null; renderSheet(); },
  'custom-delete': async el => {
    if (!confirmTwice(`cx-${el.dataset.id}`)) return;
    await deleteCustomExercise(el.dataset.id);
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
  'progress-mode': el => { state.progress.mode = el.dataset.mode; state.confirm = null; render(); },
  'bw-range': el => { state.progress.range = el.dataset.range; render(); },
  'bw-show-all': () => { state.bodyShowAll = !state.bodyShowAll; render(); },
  'bw-delete': async el => {
    const id = el.dataset.id;
    if (!confirmTwice(`bw-${id}`)) return;
    await Store.deleteBodyWeight(id);
    state.bodyWeights = state.bodyWeights.filter(w => w.id !== id);
    toast('Registrazione eliminata.');
    render();
  },

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
  // Nota dell'esercizio: salvata mentre si scrive (la bozza sopravvive alla chiusura)
  if (t.dataset.nfield === 'note' && state.draft) {
    const ex = state.draft.exercises[+t.dataset.i];
    ex.note = Model.cleanNote(t.value);
    const count = document.getElementById(`note-count-${t.dataset.i}`);
    if (count) count.textContent = `${ex.note.length}/${Model.NOTE_MAX}`;
    saveDraft({ immediate: false });
    return;
  }
  // Selettore esercizi: aggiorno solo l'elenco, così il campo di ricerca resta attivo
  if (t.dataset.field === 'picker-query' && state.picker) {
    state.picker.query = t.value;
    $('#picker-results').innerHTML = renderPickerResults();
    return;
  }
  if (t.dataset.pfield && state.picker && state.picker.timer) {
    if (t.dataset.pfield === 'timer-enabled') {
      state.picker.timer.enabled = t.checked;
      const top = $('#sheet').scrollTop;
      renderSheet();                      // mostra/nasconde "Durata (secondi)"
      $('#sheet').scrollTop = top;
    } else state.picker.timer.seconds = t.value;
    return;
  }
  if (t.dataset.dfield && state.draft) {
    const i = +t.dataset.i;
    const ex = state.draft.exercises[i];
    const tm = Model.cleanTimer(ex.timer);
    if (t.dataset.dfield === 'timer-enabled') {
      ex.timer = { ...tm, enabled: t.checked };
      // Spegnendo il timer, si ferma un eventuale conto alla rovescia di questo esercizio.
      const run = state.draft.timer;
      if (!t.checked && run && run.kind === 'set' && run.i === i) state.draft.timer = null;
      saveDraft(); render(); updateTimer();
    } else {
      ex.timer = { ...tm, seconds: typedSeconds(t.value) };
      saveDraft({ immediate: false });   // i pulsanti "Avvia timer" si aggiornano all'uscita dal campo
    }
    return;
  }
  if (t.dataset.cfield && state.picker && state.picker.form) {
    state.picker.form[t.dataset.cfield] = t.type === 'checkbox' ? t.checked : t.value;
    return;
  }
  if (t.dataset.sfield === 'copyWeight') {
    state.settings = Model.cleanSettings({ ...state.settings, copyWeight: t.checked });
    safely(() => Store.saveSettings(state.settings));
    toast(t.checked ? 'Copia del peso attiva.' : 'Copia del peso disattivata.');
    return;
  }
  // Peso corporeo: il valore resta tra un ridisegno e l'altro
  if (t.dataset.bfield === 'kg') { state.bodyForm.kg = t.value; return; }
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
  if (t.dataset.dfield === 'timer-seconds' && state.draft) { saveDraft(); render(); return; }
  if (t.dataset.field === 'picker-equip' && state.picker) {
    state.picker.equip = t.value;
    $('#picker-results').innerHTML = renderPickerResults();
    return;
  }
  if (t.dataset.field === 'kg' && state.draft) {
    const row = t.closest('.set-row');
    if (!row) return;
    const n = toNum(t.value);
    if (Number.isFinite(n) && n >= 0) {
      t.value = fmtKgInput(n);
      state.draft.exercises[+row.dataset.i].sets[+row.dataset.j].kg = t.value;
    }
    // Copia alle serie successive confrontando con il peso che c'era quando si è entrati nel campo.
    if (t.dataset.orig !== undefined) showCopiedKg(+row.dataset.i, copyKgForward(+row.dataset.i, +row.dataset.j, t.dataset.orig, t.value));
    t.dataset.orig = t.value;
    saveDraft();
    return;
  }
  if (t.dataset.bfield === 'date') { state.bodyForm.date = t.value; render(); return; } // aggiorna "Salva/Aggiorna" 
  if (t.id === 'import-file' && t.files && t.files[0]) {
    const file = t.files[0];
    t.value = '';
    safely(() => importFile(file));
  }
});

document.addEventListener('submit', e => {
  const form = e.target;
  if (form.dataset.form === 'custom-ex') {
    e.preventDefault();
    safely(saveCustomForm);
  } else if (form.dataset.form === 'body-weight') {
    e.preventDefault();
    document.activeElement && document.activeElement.blur(); // chiude la tastiera
    safely(saveBodyWeightFromForm);
  } else if (form.dataset.form === 'editor') {
    e.preventDefault();
    safely(saveEditor);
  }
});

// Uscita dal campo nota: si salva e si richiude. Il breve ritardo lascia arrivare il tocco
// su "Cancella nota", che altrimenti sparirebbe col ridisegno.
let noteBlurTimer;
document.addEventListener('focusout', e => {
  const t = e.target;
  if (!t.dataset || t.dataset.nfield !== 'note' || !state.draft) return;
  const i = +t.dataset.i;
  clearTimeout(noteBlurTimer);
  noteBlurTimer = setTimeout(() => {
    if (state.noteEdit !== i || !state.draft) return;
    const ex = state.draft.exercises[i];
    if (ex) ex.note = Model.cleanNote(ex.note).trim();
    state.noteEdit = null;
    saveDraft();
    refreshNoteBlock(i);
  }, 150);
});

// Peso al momento in cui si entra nel campo kg: serve per la copia alle serie successive.
document.addEventListener('focusin', e => {
  const t = e.target;
  if (t.dataset && t.dataset.field === 'kg' && t.closest('#view-oggi .set-row')) t.dataset.orig = t.value;
});

// Esc chiude il selettore (tastiera esterna).
document.addEventListener('keydown', e => { if (e.key === 'Escape' && state.picker) closePicker(); });

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
    state.library = await loadLibrary();
    const data = await Store.load(state.library);
    state.customExercises = data.customExercises || [];
    state.plans = data.plans;
    state.sessions = data.sessions;
    state.bodyWeights = data.bodyWeights || [];
    state.settings = data.settings || { ...Model.DEFAULT_SETTINGS };
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
