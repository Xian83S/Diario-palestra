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
 * Tutti i campi mancanti vengono completati con i valori predefiniti.
 * Le sessioni registrate non cambiano tra le versioni.
 */
const Model = (() => {
  const DATA_VERSION = 3;
  const DEFAULT_REPS = 10;
  const DEFAULT_SETS = 3;
  const REST = { default: 90, min: 15, max: 600, step: 15 }; // secondi
  const TIMER = { seconds: 30, max: 3600 };                   // secondi

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

  return { DATA_VERSION, REST, TIMER, cleanRest, cleanTimer, migratePlan, migratePlans, migratePlanExercise };
})();
