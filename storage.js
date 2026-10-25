/*
 * Livello di accesso ai dati — l'unico punto che sa DOVE stanno i dati.
 *
 * Oggi usa localStorage del telefono. Tutte le funzioni restituiscono una
 * Promise, così in futuro si può sostituire questo file con un servizio
 * esterno (API, database remoto…) senza toccare app.js.
 *
 * Interfaccia:
 *   load(library)        -> { plans, sessions, draft, bodyWeights, settings, customExercises }
 *                           (migra i dati vecchi e collega gli esercizi alla libreria, vedi model.js)
 *   savePlans(plans)
 *   saveSession(session)  (inserisce o aggiorna per id)
 *   deleteSession(id)
 *   saveDraft(draft|null) (allenamento in corso; null = elimina)
 *   saveBodyWeight(entry) (peso corporeo; sostituisce quello della stessa data)
 *   deleteBodyWeight(id)
 *   saveSettings(settings) (es. passo dei pulsanti −/+ dei kg)
 *   saveCustomExercises(list) (esercizi personalizzati)
 *   replaceAll({plans, sessions, bodyWeights, settings, customExercises})  (usato dall'importazione backup)
 *   getLastBackup() / markBackup()
 *   requestPersistence()
 */
const Store = (() => {
  const KEYS = {
    plans: 'diarioPalestra.plans',
    sessions: 'diarioPalestra.sessions',
    draft: 'diarioPalestra.draft',
    bodyWeights: 'diarioPalestra.bodyWeights',
    settings: 'diarioPalestra.settings',
    customExercises: 'diarioPalestra.customExercises',
    lastBackup: 'diarioPalestra.lastBackup',
    dataVersion: 'diarioPalestra.dataVersion',
    // Copie di sicurezza prima di ogni migrazione: diarioPalestra.plans.v1, .v2, …
    plansCopy: version => `diarioPalestra.plans.v${version}`,
    sessionsCopy: version => `diarioPalestra.sessions.v${version}`,
  };

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      throw new Error('Impossibile salvare sul telefono (spazio esaurito o archiviazione bloccata).');
    }
  }

  function remove(key) {
    try { localStorage.removeItem(key); } catch { /* niente da fare */ }
  }

  return {
    async load(library) {
      let plans = read(KEYS.plans, []);
      let sessions = read(KEYS.sessions, []);
      let draft = read(KEYS.draft, null);
      let customExercises = Model.cleanCustomExercises(read(KEYS.customExercises, []));
      if (!Array.isArray(plans)) plans = [];
      if (!Array.isArray(sessions)) sessions = [];
      if (draft && !Array.isArray(draft.exercises)) draft = null;
      const version = read(KEYS.dataVersion, 1);
      const copy = (key, value) => { if (localStorage.getItem(key) === null) write(key, value); };

      // Schede: formato attuale (v1 -> v2 -> v3, campi mancanti completati).
      if (version < Model.DATA_VERSION && plans.length) copy(KEYS.plansCopy(version), plans);
      plans = Model.migratePlans(plans);

      // v6: identificativo stabile degli esercizi. Serve la libreria: senza, non si tocca nulla
      // e si riprova al prossimo avvio (i dati restano leggibili per nome).
      let target = Math.max(version, 5);
      if (library) {
        if (version < 6 && sessions.length) copy(KEYS.sessionsCopy(version), sessions);
        const linked = Model.linkExercises({ plans, sessions, draft, customExercises }, library);
        if (linked.linked.length || linked.created.length) {
          ({ plans, sessions, draft, customExercises } = linked);
          write(KEYS.plans, plans);
          write(KEYS.sessions, sessions);
          if (draft) write(KEYS.draft, draft);
          write(KEYS.customExercises, customExercises);
        }
        target = Model.DATA_VERSION;
      }
      // v7: note per esercizio (non serve la libreria). Copia di sicurezza prima di convertire.
      if (version < 7) {
        if (sessions.length) copy(KEYS.sessionsCopy(version), sessions);
        ({ plans, sessions, draft, customExercises } = Model.migrateV7({ plans, sessions, draft, customExercises }));
        write(KEYS.sessions, sessions);
        if (draft) write(KEYS.draft, draft);
        if (version >= 6) target = Model.DATA_VERSION; // già collegati alla libreria
      }
      if (version < target) {
        write(KEYS.plans, plans);
        write(KEYS.dataVersion, target);
      }
      return {
        plans,
        sessions,
        draft,
        bodyWeights: Model.cleanBodyWeights(read(KEYS.bodyWeights, [])),
        settings: Model.cleanSettings(read(KEYS.settings, null)),
        customExercises,
      };
    },

    async savePlans(plans) {
      write(KEYS.plans, plans);
    },

    async saveSession(session) {
      const all = read(KEYS.sessions, []);
      const i = all.findIndex(s => s.id === session.id);
      if (i >= 0) all[i] = session; else all.push(session);
      write(KEYS.sessions, all);
    },

    async deleteSession(id) {
      write(KEYS.sessions, read(KEYS.sessions, []).filter(s => s.id !== id));
    },

    async saveDraft(draft) {
      if (draft) write(KEYS.draft, draft); else remove(KEYS.draft);
    },

    async saveBodyWeight(entry) {
      const all = read(KEYS.bodyWeights, []).filter(w => w && w.date !== entry.date && w.id !== entry.id);
      all.push(entry);
      write(KEYS.bodyWeights, Model.cleanBodyWeights(all));
    },

    async deleteBodyWeight(id) {
      write(KEYS.bodyWeights, read(KEYS.bodyWeights, []).filter(w => w && w.id !== id));
    },

    async saveSettings(settings) {
      write(KEYS.settings, settings);
    },

    async saveCustomExercises(list) {
      write(KEYS.customExercises, list);
    },

    async replaceAll({ plans, sessions, bodyWeights, settings, customExercises }) {
      write(KEYS.plans, plans);
      write(KEYS.sessions, sessions);
      if (bodyWeights) write(KEYS.bodyWeights, bodyWeights);
      if (settings) write(KEYS.settings, settings);
      if (customExercises) write(KEYS.customExercises, customExercises);
    },

    async getLastBackup() {
      return read(KEYS.lastBackup, null);
    },

    async markBackup() {
      write(KEYS.lastBackup, new Date().toISOString());
    },

    /* Chiede al browser di non cancellare i dati in automatico (se supportato). */
    async requestPersistence() {
      try {
        if (navigator.storage && navigator.storage.persist) {
          return await navigator.storage.persist();
        }
      } catch { /* non supportato */ }
      return false;
    },
  };
})();
