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
 * Tutti i campi mancanti vengono completati con i valori predefiniti.
 * Le sessioni registrate non cambiano tra le versioni.
 */
const Model = (() => {
  const DATA_VERSION = 4;
  const DEFAULT_REPS = 10;
  const DEFAULT_SETS = 3;
  const REST = { default: 90, min: 15, max: 600, step: 15 }; // secondi
  const TIMER = { seconds: 30, max: 3600 };                   // secondi
  const BODY_WEIGHT = { min: 20, max: 400 };                  // kg accettati

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

  /** Porta un esercizio di scheda (v1, v2 o v3) al formato attuale. Restituisce null se non valido. */
  function migratePlanExercise(ex) {
    if (!ex || typeof ex !== 'object' || !String(ex.name ?? '').trim()) return null;
    let sets;
    if (Array.isArray(ex.sets)) {
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
    return { id: String(ex.id || newId()), name: String(ex.name).trim(), sets, rest: cleanRest(ex.rest), timer: cleanTimer(ex.timer) };
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

  return {
    DATA_VERSION, REST, TIMER, BODY_WEIGHT,
    cleanRest, cleanTimer, migratePlan, migratePlans, migratePlanExercise,
    validBodyKg, cleanBodyWeight, cleanBodyWeights,
  };
})();
