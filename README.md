# Diario Palestra

Diario di allenamento da installare su iPhone: si apre dall'icona sulla Home, a schermo intero, e funziona anche senza connessione in palestra.
È fatto solo di file statici, senza framework e senza passaggi di compilazione.

## Cosa c'è nella cartella

| File | A cosa serve |
|---|---|
| `index.html` | La pagina dell'app con i meta tag per la modalità app su iPhone |
| `style.css` | Grafica: tema chiaro e scuro automatico, font Barlow / Barlow Condensed |
| `app.js` | Interfaccia: Oggi, Schede, Progressi, Storico, backup |
| `model.js` | Versione del modello dati e migrazione automatica dei dati vecchi (usata al caricamento e all'importazione dei backup) |
| `storage.js` | Livello di accesso ai dati (`load`, `savePlans`, `saveSession`, `deleteSession`, …). Oggi usa la memoria del telefono (localStorage). È l'unico file da sostituire per passare in futuro a un servizio esterno |
| `sw.js` | Service worker: salva i file dell'app sul telefono per l'uso offline |
| `manifest.webmanifest` | Nome, icone e modalità `standalone` dell'app |
| `icons/` | Icone 180 (iPhone), 192, 512 px e favicon. `tools/make-icons.py` le rigenera |
| `fonts/` | Font Barlow inclusi nei file (licenza SIL OFL in `fonts/OFL.txt`) |
| `.nojekyll` | Dice a GitHub Pages di pubblicare i file così come sono |

## Pubblicazione con GitHub Pages (consigliata)

Il codice è già su GitHub, quindi questa è la strada più breve. L'indirizzo finale sarà
**https://xian83s.github.io/Diario-palestra/**

1. **Porta i file sul ramo `main`.** Su github.com apri il repository, poi *Pull requests* → apri (o crea) la pull request dal ramo `claude/diario-palestra-pwa-mxu97z` verso `main` → *Merge pull request* → *Confirm merge*.
2. **Controlla la visibilità.** Con l'account gratuito GitHub Pages funziona solo con i repository **pubblici**. Se il repository è privato: *Settings* → in fondo *Danger Zone* → *Change visibility* → *Public*. Se preferisci tenerlo privato, usa Netlify (sezione sotto).
   I tuoi allenamenti **non** finiscono nel repository: restano sul telefono. Nel repository c'è solo il codice dell'app.
3. **Attiva Pages.** *Settings* → *Pages* (menu a sinistra) → in *Build and deployment*, *Source*: **Deploy from a branch** → *Branch*: **main** e cartella **/ (root)** → *Save*.
4. **Aspetta 1–2 minuti.** In cima alla stessa pagina comparirà "Your site is live at …". Apri quell'indirizzo dal computer per controllare che l'app si veda.

## In alternativa: Netlify (anche con repository privato)

1. Scarica il repository come ZIP (*Code* → *Download ZIP*) e scompattalo.
2. Vai su **https://app.netlify.com/drop**, crea un account gratuito e trascina nella pagina la cartella scompattata.
3. Netlify ti dà un indirizzo tipo `https://nome-a-caso.netlify.app`. Puoi cambiarlo in *Site configuration* → *Change site name*.
4. Per gli aggiornamenti successivi: *Deploys* → trascina di nuovo la cartella aggiornata.
   In alternativa, *Add new site* → *Import an existing project* → GitHub collega il repository, e Netlify pubblica da solo ogni modifica su `main`.

(Vercel funziona allo stesso modo: *Add New* → *Project* → importa il repository, preset "Other", nessun comando di build.)

## Installazione sull'iPhone

1. Apri l'indirizzo dell'app con **Safari**. Da Chrome o da altre app non si può aggiungere alla Home come app.
2. Tocca il pulsante **Condividi** (il quadrato con la freccia verso l'alto).
3. Scorri e scegli **Aggiungi alla schermata Home** → *Aggiungi*.
4. Apri l'app **dall'icona "Palestra"** sulla Home: si apre a schermo intero.
5. Al primo avvio con la connessione attiva l'app salva i suoi file sul telefono. Da quel momento funziona anche offline.

> I dati salvati dall'icona sulla Home e quelli salvati da Safari sono **separati**. Usa sempre l'icona.

## Timer di recupero

- In **Schede** ogni esercizio ha il suo tempo di recupero, regolabile da 0:15 a 10:00 a passi di 15 secondi (predefinito 1:30).
- Durante l'allenamento il timer parte **solo** quando tocchi **Recupero** sotto l'esercizio. Durante il conteggio puoi togliere o aggiungere 15 secondi, oppure chiuderlo con ✕.
- Alla fine il riquadro diventa giallo con scritto **"Via!"** e l'app suona tre bip.
- Il timer resta salvato con l'allenamento in corso: se chiudi l'app e la riapri, riprende dal tempo giusto.

Limiti di iPhone da sapere:
- I bip suonano solo se l'app è **aperta sullo schermo** e la suoneria non è in modalità silenziosa. Con il telefono bloccato o l'app in background iOS non lascia suonare un'app web. Quando torni nell'app, il timer mostra comunque il tempo giusto.
- La vibrazione non è disponibile su iPhone per le app web.
- Mentre il recupero è in corso l'app chiede di tenere lo schermo acceso (su iOS recenti).

## Timer per esercizi a tempo (plank, isometrie)

- In **Schede**, per ogni esercizio, c'è l'interruttore **Timer** (spento di default). Se lo accendi compare **Durata (secondi)**.
- Durante l'allenamento, se il timer è acceso e la durata è maggiore di 0, ogni serie di quell'esercizio mostra **Avvia timer**. Con il timer spento o con durata 0 non compare nessun pulsante.
- Alla fine del conto alla rovescia l'app suona, segna la serie come fatta e fa partire subito il recupero dell'esercizio.
- **Ferma timer** interrompe il conto senza segnare la serie.
- Il tempo è calcolato dall'ora di fine. Se chiudi l'app durante una serie, alla riapertura la serie risulta fatta e il recupero mostra il tempo giusto, come se fosse partito alla fine della serie.
- Dopo che l'app è stata riaperta, iPhone fa suonare solo dopo un tocco sullo schermo: basta toccare un punto qualsiasi.

## Peso corporeo

- Si trova in **Progressi → Peso corporeo**.
- **Registra il peso:** data (predefinita oggi) e kg, da 20 a 400. Si salva un valore per giorno: se la data ha già un peso, il pulsante diventa **Aggiorna peso** e il nuovo valore sostituisce il vecchio.
- **Grafico:** filtrabile per 1 mese, 3 mesi o tutto. Le date sono distanziate in base ai giorni reali, quindi una pausa di due settimane si vede.
- **Riquadri:** peso attuale, variazione nel periodo, media degli ultimi 7 giorni, minimo e massimo del periodo.
- **Elenco:** ogni registrazione mostra la differenza rispetto alla precedente e si elimina con due tocchi.
- **Backup:** i pesi sono inclusi nell'esportazione. All'importazione vengono uniti per data, e a parità di data vince il file importato. I backup vecchi, senza pesi, non toccano quelli che hai.

## Backup: importante

iOS può cancellare i dati dei siti e delle app web che non usi per un po' di tempo. Per non perdere lo storico:

- **Storico** → **Esporta dati** → nel foglio di condivisione scegli **Salva in File** (per esempio in iCloud Drive). Viene creato un file `diario-palestra-AAAA-MM-GG.json`.
- Per recuperare i dati, anche su un altro telefono: **Storico** → **Importa backup** → scegli il file. L'importazione **unisce** i dati: un allenamento o una scheda con lo stesso identificativo viene sostituito, e il resto si aggiunge.
- L'app mostra la data dell'ultimo backup e la evidenzia se sono passati più di 14 giorni.

## Versione dei dati

Il formato dei dati ha un numero di versione (`Model.DATA_VERSION` in `model.js`), che viene scritto anche nei backup esportati.

- **Versione 1:** ogni esercizio di una scheda aveva `sets`, `reps` e `weight` unici (es. 4 serie da 8 a 60 kg).
- **Versione 2:** ogni serie ha le proprie ripetizioni e il proprio peso: `sets: [{reps: 10, weight: 55}, {reps: 8, weight: 60}, …]`, più il recupero `rest` in secondi.
- **Versione 3:** ogni esercizio ha anche `timer: {enabled, seconds}` per gli esercizi a tempo. Per le schede esistenti vale `{enabled: false, seconds: 30}`.
- **Versione 4:** nuova raccolta `bodyWeights` per il peso corporeo, `[{id, date, kg, createdAt}]`, con al massimo una registrazione per data. Viene inclusa nei backup.

All'apertura l'app converte da sola le schede vecchie: 4×8 a 60 kg diventa 4 serie identiche da 8 a 60 kg. Prima di ogni conversione salva una copia delle schede com'erano (`diarioPalestra.plans.v1`, `diarioPalestra.plans.v2`, …). Le sessioni già registrate non vengono toccate. Anche i backup vecchi, compresi quelli senza numero di versione, vengono convertiti all'importazione. Un backup creato da una versione più recente dell'app viene rifiutato.

## Pubblicare una modifica

1. Modifica i file.
2. **In `sw.js` aumenta `VERSION`** (es. da `'v1'` a `'v2'`). Altrimenti il telefono continua a usare i file vecchi salvati in cache.
3. Pubblica (merge su `main` con GitHub Pages, oppure trascina di nuovo la cartella su Netlify).
4. Alla successiva apertura l'app mostra "Nuova versione disponibile": tocca **Aggiorna**. L'allenamento in corso non si perde.

## Prova sul computer

```sh
python3 -m http.server 8000
# poi apri http://localhost:8000
```

Il service worker funziona solo su `https://` oppure su `localhost`. Aprire direttamente `index.html` dal disco non basta.

## Regole di calcolo

- **1RM stimato** (formula di Epley): `kg × (1 + ripetizioni / 30)`. Con 1 ripetizione vale `kg`.
- **Volume**: somma di `kg × ripetizioni`.
- **Nuovo record**: c'è solo se il peso massimo supera il massimo precedente dello stesso esercizio. La prima volta che fai un esercizio non conta come record.
- Gli esercizi si confrontano per nome, senza distinguere maiuscole e minuscole e ignorando gli spazi all'inizio e alla fine.
- Quando termini l'allenamento vengono salvate solo le serie segnate come fatte, con kg ≥ 0 e almeno 1 ripetizione.

## Prossimi passi

1. Timer di recupero tra le serie.
2. Peso corporeo nel tempo.
3. Garmin: verificare cosa è davvero accessibile (Garmin Connect, Apple Salute, esportazione file). Un'app web non può leggere i dati Garmin o Salute direttamente. Solo se serve un accesso diretto si valuta un'app iPhone nativa (serve un Mac con Xcode).
