/*
 * Livello di accesso ai dati — l'unico punto che sa DOVE stanno i dati.
 *
 * Oggi usa localStorage del telefono. Tutte le funzioni restituiscono una
 * Promise, così in futuro si può sostituire questo file con un servizio
 * esterno (API, database remoto…) senza toccare app.js.
 *
 * Interfaccia:
 *   load()               -> { plans, sessions, draft }  (migra i dati vecchi, vedi model.js)
 *   savePlans(plans)
 *   saveSession(session)  (inserisce o aggiorna per id)
 *   deleteSession(id)
 *   saveDraft(draft|null) (allenamento in corso; null = elimina)
 *   replaceAll({plans, sessions})  (usato dall'importazione backup)
 *   getLastBackup() / markBackup()
 *   requestPersistence()
 */
const Store = (() => {
  const KEYS = {
    plans: 'diarioPalestra.plans',
    sessions: 'diarioPalestra.sessions',
    draft: 'diarioPalestra.draft',
    lastBackup: 'diarioPalestra.lastBackup',
    dataVersion: 'diarioPalestra.dataVersion',
    // Copia di sicurezza prima di ogni migrazione: diarioPalestra.plans.v1, .v2, …
    plansCopy: version => `diarioPalestra.plans.v${version}`,
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
    async load() {
      let plans = read(KEYS.plans, []);
      const sessions = read(KEYS.sessions, []);
      const version = read(KEYS.dataVersion, 1);
      if (version < Model.DATA_VERSION) {
        // Migrazione automatica delle schede (le sessioni restano com'erano).
        if (Array.isArray(plans) && plans.length && localStorage.getItem(KEYS.plansCopy(version)) === null) {
          write(KEYS.plansCopy(version), plans);
        }
        plans = Model.migratePlans(plans);
        write(KEYS.plans, plans);
        write(KEYS.dataVersion, Model.DATA_VERSION);
      } else {
        // Completa i campi facoltativi (es. recupero) senza riscrivere i dati.
        plans = Model.migratePlans(plans);
      }
      return {
        plans: Array.isArray(plans) ? plans : [],
        sessions: Array.isArray(sessions) ? sessions : [],
        draft: read(KEYS.draft, null),
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

    async replaceAll({ plans, sessions }) {
      write(KEYS.plans, plans);
      write(KEYS.sessions, sessions);
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
