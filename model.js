/*
 * Versione del modello dati e migrazioni.
 * Usato sia al caricamento (storage.js) sia all'importazione dei backup (app.js).
 *
 * Versioni:
 *   1 — esercizio di una scheda: {id, name, sets: 4, reps: 8, weight: 60}
 *   2 — esercizio di una scheda: {id, name, sets: [{reps: 8, weight: 60}, …]}
 *       (ogni serie ha le proprie ripetizioni e il proprio peso)
 *       + campo facoltativo `rest`: secondi di recupero tra le serie (predefinito 90).
 *   3 — come la 2, più `timer: {enabled, seconds}` per gli esercizi a tempo
 *       (plank, isometrie). Predefinito: {enabled: false, seconds: 30}.
 *   4 — nuova raccolta `bodyWeights`: [{id, date: "YYYY-MM-DD", kg, createdAt}],
 *       al massimo una registrazione per data. Le schede non cambiano.
 *   5 — nuove impostazioni `settings: {weightStep}`: passo dei pulsanti −/+ dei kg
 *       (1, 2,5 o 5; predefinito 2,5).
 *   6 — identificativo stabile degli esercizi: ogni esercizio di schede, sessioni
 *       e bozza ha `exerciseId` (id della libreria data/esercizi.json oppure
 *       "custom-…") più `name`, copia del nome al momento. Nuova raccolta
 *       `customExercises` per gli esercizi personalizzati. La migrazione
 *       (linkExercises) aggiunge solo gli id: nomi, serie e date restano uguali.
 *   7 — ogni esercizio di sessioni e bozza ha `note` (testo, massimo 500 caratteri;
 *       vuota per i dati vecchi) e ogni esercizio di schede, sessioni, bozza e
 *       personalizzati ha `type`: "strength" (predefinito, tutti i dati vecchi) o
 *       "cardio". Per il cardio ogni "serie" è un blocco
 *       {minutes, speedKmh, inclinePct} (+ `done` nella bozza e nelle sessioni).
 *       Migrazione: migrateV7.
 * Tutti i campi mancanti vengono completati con i valori predefiniti.
 * Le sessioni registrate non cambiano tra le versioni.
 */
const Model = (() => {
  const DATA_VERSION = 7;
  const NOTE_MAX = 500;
  const DEFAULT_REPS = 10;
  const DEFAULT_SETS = 3;
  const REST = { default: 90, min: 15, max: 600, step: 15 }; // secondi
  const TIMER = { seconds: 30, max: 3600 };                   // secondi
  const BODY_WEIGHT = { min: 20, max: 400 };                  // kg accettati
  const WEIGHT_STEPS = [1, 2.5, 5];                           // passo dei pulsanti −/+ (kg)
  const SPEED_STEPS = [0.1, 0.5];                             // passo dei pulsanti −/+ della velocità (km/h)
  const INCLINE_STEPS = [0.5, 1];                             // passo dei pulsanti −/+ della pendenza (%)
  const DEFAULT_SETTINGS = { weightStep: 2.5, copyWeight: true, speedStep: 0.5, inclineStep: 0.5 };
  const TYPES = ['strength', 'cardio'];
  /** Campi possibili di un blocco cardio. Ogni macchina ne usa un elenco (cardioFields). */
  const CARDIO_FIELDS = {
    minutes: { label: 'Durata', unit: 'min', min: 0, max: 600, positive: true },
    speedKmh: { label: 'Velocità', unit: 'km/h', min: 0, max: 30 },
    inclinePct: { label: 'Pendenza', unit: '%', min: 0, max: 30 },
  };
  const TREADMILL_FIELDS = ['minutes', 'speedKmh', 'inclinePct']; // per ora l'unica macchina
  const BODY_PARTS = ['Petto', 'Schiena', 'Spalle', 'Bicipiti', 'Tricipiti', 'Quadricipiti',
    'Femorali', 'Glutei', 'Polpacci', 'Core', 'Corpo intero/Cardio'];
  const EQUIPMENT = ['bilanciere', 'manubri', 'macchina', 'cavi', 'corpo libero', 'kettlebell', 'elastici', 'altro'];

  /** Chiave usata fino alla versione 5 per riconoscere lo stesso esercizio (maiuscole e spazi ai bordi). */
  const norm = s => String(s ?? '').trim().toLowerCase();
  /** Chiave di ricerca: senza maiuscole, spazi, accenti e punteggiatura ("Pull-down" = "pulldown"). */
  const fold = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const slug = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'esercizio';
  const isCustomId = id => String(id ?? '').startsWith('custom-');

  const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : NaN; };
  const cleanReps = v => { const n = Math.round(num(v)); return n >= 1 ? n : DEFAULT_REPS; };
  const cleanWeight = v => { const n = num(v); return n >= 0 ? n : 0; };
  const cleanRest = v => {
    const n = Math.round(num(v));
    return Number.isFinite(n) && n > 0 ? Math.min(REST.max, Math.max(REST.min, n)) : REST.default;
  };
  /** Timer dell'esercizio: acceso solo se enabled === true; durata intera 0…3600 s. */
  const cleanTimer = t => {
    const obj = t && typeof t === 'object' ? t : {};
    const n = Math.round(num(obj.seconds));
    return {
      enabled: obj.enabled === true,
      seconds: Number.isFinite(n) && n >= 0 ? Math.min(TIMER.max, n) : TIMER.seconds,
    };
  };
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  const typeOf = x => (x && x.type === 'cardio') ? 'cardio' : 'strength';
  const round2 = n => Math.round(n * 100) / 100;

  /**
   * Blocco cardio valido o null: durata > 0 (anche decimale), velocità e pendenza 0…30
   * (se mancano valgono 0). Con keepDone conserva `done`.
   */
  function cleanCardioBlock(b, keepDone = false) {
    if (!b || typeof b !== 'object') return null;
    const minutes = num(b.minutes);
    if (!(minutes > 0)) return null;
    const lim = (v, f) => { const n = num(v); return Number.isFinite(n) ? round2(Math.min(f.max, Math.max(f.min, n))) : 0; };
    return {
      minutes: round2(Math.min(CARDIO_FIELDS.minutes.max, minutes)),
      speedKmh: lim(b.speedKmh, CARDIO_FIELDS.speedKmh),
      inclinePct: lim(b.inclinePct, CARDIO_FIELDS.inclinePct),
      ...(keepDone ? { done: b.done === true } : {}),
    };
  }

  /** Porta un esercizio di scheda (v1, v2 o v3) al formato attuale. Restituisce null se non valido. */
  function migratePlanExercise(ex) {
    if (!ex || typeof ex !== 'object' || !String(ex.name ?? '').trim()) return null;
    let sets;
    if (typeOf(ex) === 'cardio') {
      // cardio: blocchi previsti {minutes, speedKmh, inclinePct}
      sets = (Array.isArray(ex.sets) ? ex.sets : []).map(b => cleanCardioBlock(b)).filter(Boolean);
      if (!sets.length) sets = [{ minutes: 30, speedKmh: 0, inclinePct: 0 }];
    } else if (Array.isArray(ex.sets)) {
      // v2: lista di serie
      sets = ex.sets.filter(s => s && typeof s === 'object').map(s => ({ reps: cleanReps(s.reps), weight: cleanWeight(s.weight) }));
    } else {
      // v1: numero di serie identiche
      const n = Math.round(num(ex.sets));
      const count = n >= 1 ? Math.min(n, 50) : DEFAULT_SETS;
      const set = { reps: cleanReps(ex.reps), weight: cleanWeight(ex.weight) };
      sets = Array.from({ length: count }, () => ({ ...set }));
    }
    if (!sets.length) sets = [{ reps: DEFAULT_REPS, weight: 0 }];
    return {
      id: String(ex.id || newId()),
      ...(ex.exerciseId ? { exerciseId: String(ex.exerciseId) } : {}),
      name: String(ex.name).trim(), type: typeOf(ex), sets, rest: cleanRest(ex.rest), timer: cleanTimer(ex.timer),
    };
  }

  /** Porta una scheda al formato attuale. Restituisce null se non valida. */
  function migratePlan(p) {
    if (!p || typeof p !== 'object' || !String(p.name ?? '').trim()) return null;
    const exercises = (Array.isArray(p.exercises) ? p.exercises : []).map(migratePlanExercise).filter(Boolean);
    return { id: String(p.id || newId()), name: String(p.name).trim(), exercises };
  }

  function migratePlans(plans) {
    return (Array.isArray(plans) ? plans : []).map(migratePlan).filter(Boolean);
  }

  const isDate = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d)) && !Number.isNaN(new Date(`${d}T00:00:00`).getTime());
  const validBodyKg = kg => Number.isFinite(kg) && kg >= BODY_WEIGHT.min && kg <= BODY_WEIGHT.max;

  /** Una registrazione del peso corporeo, o null se non valida (kg arrotondati a 0,01). */
  function cleanBodyWeight(w) {
    if (!w || typeof w !== 'object' || !isDate(w.date)) return null;
    const kg = num(w.kg);
    if (!validBodyKg(kg)) return null;
    return {
      id: String(w.id || newId()),
      date: w.date,
      kg: Math.round(kg * 100) / 100,
      createdAt: w.createdAt ? String(w.createdAt) : new Date().toISOString(),
    };
  }

  /** Pulisce la raccolta: una registrazione per data (vince la più recente), in ordine di data. */
  function cleanBodyWeights(list) {
    const byDate = new Map();
    for (const w of (Array.isArray(list) ? list : []).map(cleanBodyWeight).filter(Boolean)) {
      const prev = byDate.get(w.date);
      if (!prev || String(w.createdAt) >= String(prev.createdAt)) byDate.set(w.date, w);
    }
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }

  /** Impostazioni: valori non ammessi tornano al predefinito. */
  function cleanSettings(s) {
    const obj = s && typeof s === 'object' ? s : {};
    const step = num(obj.weightStep), speed = num(obj.speedStep), incline = num(obj.inclineStep);
    return {
      weightStep: WEIGHT_STEPS.includes(step) ? step : DEFAULT_SETTINGS.weightStep,
      copyWeight: obj.copyWeight !== false,   // "Copia il peso alle serie successive" (acceso se assente)
      speedStep: SPEED_STEPS.includes(speed) ? speed : DEFAULT_SETTINGS.speedStep,
      inclineStep: INCLINE_STEPS.includes(incline) ? incline : DEFAULT_SETTINGS.inclineStep,
    };
  }

  const cleanList = v => (Array.isArray(v) ? v : String(v ?? '').split(','))
    .map(x => String(x ?? '').trim()).filter(Boolean).slice(0, 20);

  /**
   * Id di un nuovo esercizio personalizzato, ricavato dal nome ("custom-panca-convergente"):
   * lo stesso nome dà lo stesso id su ogni dispositivo, così importare un backup non crea
   * doppioni. Se l'id è già usato si aggiunge -2, -3, …
   */
  function customIdFor(name, taken = new Set()) {
    const base = `custom-${slug(name)}`;
    let id = base;
    for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
    return id;
  }

  /** Esercizio personalizzato, o null se senza nome. L'id ha sempre il prefisso "custom-". */
  function cleanCustomExercise(c, taken) {
    if (!c || typeof c !== 'object' || !String(c.name ?? '').trim()) return null;
    const name = String(c.name).trim().slice(0, 80);
    return {
      id: isCustomId(c.id) ? String(c.id) : customIdFor(name, taken),
      name,
      aliases: cleanList(c.aliases),
      bodyPart: BODY_PARTS.includes(c.bodyPart) ? c.bodyPart : '',
      muscles: cleanList(c.muscles),
      secondary: cleanList(c.secondary),
      equipment: EQUIPMENT.includes(c.equipment) ? c.equipment : 'altro',
      instructions: String(c.instructions ?? '').trim().slice(0, 1000),
      timed: c.timed === true,
      type: typeOf(c),
      ...(typeOf(c) === 'cardio' ? { cardioFields: TREADMILL_FIELDS.slice() } : {}),
      createdAt: c.createdAt ? String(c.createdAt) : new Date().toISOString(),
    };
  }

  function cleanCustomExercises(list) {
    const seen = new Set();
    return (Array.isArray(list) ? list : []).map(cleanCustomExercise)
      .filter(c => c && !seen.has(c.id) && seen.add(c.id));
  }

  /**
   * Collega a un exerciseId ogni esercizio che non ce l'ha ancora (schede, sessioni, bozza).
   * - Lo stesso nome (come raggruppato fino alla v5: maiuscole e spazi ai bordi) riceve sempre lo
   *   stesso id, così storico, record e grafici restano identici.
   * - Il nome si cerca nella libreria senza maiuscole, spazi e accenti, anche negli alias,
   *   poi tra gli esercizi personalizzati.
   * - Due nomi che prima erano esercizi DIVERSI restano diversi: se puntano allo stesso esercizio
   *   di libreria, lo prende il nome più usato e l'altro diventa un esercizio personalizzato.
   * - Senza corrispondenza si crea un esercizio personalizzato con lo stesso nome.
   * Senza libreria non fa nulla (si riproverà al prossimo avvio).
   */
  function linkExercises({ plans = [], sessions = [], draft = null, customExercises = [] }, library) {
    const lib = library && Array.isArray(library.exercises) ? library.exercises : null;
    const items = [];
    plans.forEach(p => p.exercises.forEach(ex => items.push(ex)));
    sessions.forEach(s => (s.exercises || []).forEach(ex => items.push(ex)));
    if (draft && Array.isArray(draft.exercises)) draft.exercises.forEach(ex => items.push(ex));
    const missing = items.filter(ex => ex && !ex.exerciseId && String(ex.name ?? '').trim());
    const result = { plans, sessions, draft, customExercises, linked: [], created: [] };
    if (!lib || !missing.length) return result;

    const byName = new Map();   // norm(nome) -> exerciseId
    const owner = new Map();    // exerciseId -> norm(nome) che lo usa
    for (const ex of items) if (ex && ex.exerciseId) {
      const k = norm(ex.name);
      if (!byName.has(k)) byName.set(k, ex.exerciseId);
      if (!owner.has(ex.exerciseId)) owner.set(ex.exerciseId, k);
    }
    const libIndex = new Map();
    for (const e of lib) for (const label of [e.name, ...(e.aliases || [])]) {
      const f = fold(label);
      if (f && !libIndex.has(f)) libIndex.set(f, e.id);
    }
    const customs = customExercises.slice();
    const customIndex = new Map(customs.map(c => [fold(c.name), c.id]));
    const free = (id, k) => id && (!owner.has(id) || owner.get(id) === k);

    // I nomi più usati scelgono per primi.
    const count = new Map(), display = new Map();
    for (const ex of missing) {
      const k = norm(ex.name);
      count.set(k, (count.get(k) || 0) + 1);
      if (!display.has(k)) display.set(k, String(ex.name).trim());
    }
    const order = [...count.keys()].sort((a, b) => count.get(b) - count.get(a) || a.localeCompare(b));
    for (const k of order) {
      if (byName.has(k)) continue;
      const f = fold(k);
      let id = free(libIndex.get(f), k) ? libIndex.get(f) : null;
      if (id) result.linked.push({ name: display.get(k), exerciseId: id });
      if (!id && free(customIndex.get(f), k)) id = customIndex.get(f);
      if (!id) {
        const c = cleanCustomExercise({ name: display.get(k) }, new Set(customs.map(x => x.id)));
        customs.push(c);
        customIndex.set(f, c.id);
        id = c.id;
        result.created.push({ name: c.name, exerciseId: id });
      }
      byName.set(k, id);
      owner.set(id, k);
    }
    const withId = ex => (!ex || ex.exerciseId || !String(ex.name ?? '').trim()) ? ex : { ...ex, exerciseId: byName.get(norm(ex.name)) };
    return {
      ...result,
      plans: plans.map(p => ({ ...p, exercises: p.exercises.map(withId) })),
      sessions: sessions.map(s => ({ ...s, exercises: (s.exercises || []).map(withId) })),
      draft: draft && Array.isArray(draft.exercises) ? { ...draft, exercises: draft.exercises.map(withId) } : draft,
      customExercises: customs,
    };
  }

  /** Nota di un esercizio: testo libero (accapo compresi), massimo 500 caratteri. */
  const cleanNote = v => String(v ?? '').slice(0, NOTE_MAX);

  /**
   * v7: completa i campi nuovi senza toccare il resto. Idempotente.
   * - sessioni e bozza: `note` ('' se manca)
   * - schede, sessioni, bozza, personalizzati: `type` ("strength" se manca: i dati vecchi sono tutti di forza)
   */
  function migrateV7({ plans = [], sessions = [], draft = null, customExercises = [] }) {
    const withType = ex => (ex && TYPES.includes(ex.type)) ? ex : { ...ex, type: 'strength' };
    const withNote = ex => (ex && typeof ex.note === 'string') ? ex : { ...ex, note: cleanNote(ex && ex.note) };
    const both = ex => withType(withNote(ex));
    return {
      plans: plans.map(p => ({ ...p, exercises: p.exercises.map(withType) })),
      sessions: sessions.map(s => ({ ...s, exercises: (s.exercises || []).map(both) })),
      draft: draft && Array.isArray(draft.exercises) ? { ...draft, exercises: draft.exercises.map(both) } : draft,
      customExercises: customExercises.map(withType),
    };
  }

  return {
    NOTE_MAX, cleanNote, migrateV7,
    TYPES, CARDIO_FIELDS, TREADMILL_FIELDS, SPEED_STEPS, INCLINE_STEPS, typeOf, cleanCardioBlock,
    DATA_VERSION, REST, TIMER, BODY_WEIGHT, WEIGHT_STEPS, DEFAULT_SETTINGS, cleanSettings,
    BODY_PARTS, EQUIPMENT, norm, fold, isCustomId, cleanCustomExercise, cleanCustomExercises, linkExercises,
    cleanRest, cleanTimer, migratePlan, migratePlans, migratePlanExercise,
    validBodyKg, cleanBodyWeight, cleanBodyWeights,
  };
})();
