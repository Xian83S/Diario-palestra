# Diario Palestra

Diario di allenamento da installare su iPhone: si apre dall'icona sulla Home, a schermo intero, e funziona anche senza connessione in palestra.
È fatto solo di file statici, senza framework e senza passaggi di compilazione.

## Cosa c'è nella cartella

| File | A cosa serve |
|---|---|
| `index.html` | La pagina dell'app con i meta tag per la modalità app su iPhone |
| `style.css` | Grafica: tema chiaro e scuro automatico, font Barlow / Barlow Condensed |
| `app.js` | Interfaccia: Oggi, Schede, Progressi, Storico, backup |
| `data/esercizi.json` | Libreria di 170 esercizi in italiano (nome, alias, parte del corpo, muscoli, attrezzo, istruzioni). Si genera con `tools/build-library.py` |
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

## Libreria esercizi

- **Dove si apre:**
  - **Aggiungere esercizi:** "+ Esercizio" nell'editor della scheda o "+ Aggiungi esercizio" durante l'allenamento apre il selettore.
  - **Consultare:** **Schede → Libreria esercizi** apre la libreria in sola lettura.
- **Il selettore:**
  - La ricerca ignora maiuscole e accenti e guarda il nome e gli alias, anche inglesi ("bench press").
  - Le parti del corpo sono bottoni in riga, l'attrezzo si sceglie da un menu.
  - Un tocco apre il dettaglio: parte del corpo, muscoli, attrezzo, istruzioni e, se ci sono, il tuo record e l'ultima volta. Da lì si aggiunge con **Aggiungi**.
  - In cima al dettaglio c'è lo spazio per un'immagine futura.
- **Esercizi a tempo:** un esercizio a tempo (`timed`, es. Plank) aggiunto a una scheda parte con il timer acceso a 30 secondi, modificabili.
- **Esercizi personalizzati:** "Crea esercizio personalizzato" in fondo al selettore.
  - Si modificano e si eliminano dal loro dettaglio.
  - Rinominarne uno aggiorna le schede; lo storico conserva il nome di allora.
  - Eliminarne uno non tocca gli allenamenti registrati: grafici e storico restano.
  - L'id nasce dal nome (`custom-panca-convergente`), quindi lo stesso nome ha lo stesso id su ogni dispositivo e importare un backup non crea doppioni.
- **Grafici, record, "Ultima volta" e "Ripeti ultimo"** lavorano per `exerciseId`. Per i dati ancora senza id usano il nome.

### Migrazione dei dati esistenti (versione 6)

- Al primo avvio ogni nome già usato viene collegato a un esercizio della libreria. Il confronto ignora maiuscole, spazi, accenti e trattini e guarda anche gli alias (per esempio "Panca piana" diventa `panca-piana-bilanciere`).
- I nomi senza corrispondenza diventano esercizi personalizzati con lo stesso nome.
- Vengono aggiunti solo gli id: nomi, serie e date restano com'erano.
- Prima della migrazione l'app salva una copia di schede e sessioni (`diarioPalestra.plans.v5`, `diarioPalestra.sessions.v5`).
- Perché storico e grafici restino **identici**, due nomi che prima erano esercizi diversi restano diversi. Se per esempio usavi sia "Panca piana" sia "Bench press", che sono alias dello stesso esercizio, il nome più usato viene collegato alla libreria e l'altro diventa personalizzato.
- La migrazione parte solo se la libreria è stata caricata. Altrimenti l'app funziona come prima, per nome, e riprova al prossimo avvio.
- I backup vecchi senza id vengono collegati allo stesso modo quando li importi.

### Aggiornare la libreria

1. Modifica `tools/build-library.py`. Non cambiare mai gli `id` esistenti.
2. Aumenta `LIBRARY_VERSION`.
3. Esegui `python3 tools/build-library.py`. Lo script controlla che id e alias siano unici, che parti del corpo e attrezzi siano tra quelli ammessi e che le istruzioni abbiano 2-3 frasi, poi riscrive `data/esercizi.json`.
4. Aumenta `VERSION` in `sw.js`.

## Note per esercizio

- Durante l'allenamento, sotto il nome di ogni esercizio c'è la riga **Nota**: "+ Aggiungi nota" se è vuota, altrimenti il testo (al massimo 2 righe a vista).
- Un tocco apre un campo su più righe, che si salva da solo quando esci. "Cancella nota" la svuota.
- Toccando un campo kg o ripetizioni la nota si chiude e la tastiera numerica resta.
- La nota si ripropone la volta dopo per lo stesso esercizio: avviando la scheda, con "Ripeti ultimo" e con "Aggiungi esercizio".
- La nota compare nello **Storico**, sotto l'esercizio, e in **Progressi → Ultime sessioni**, accanto alla data. È inclusa nei backup; quelli vecchi si importano con la nota vuota.

## Copia del peso alle serie successive

- Durante l'allenamento, quando cambi i kg di una serie, le serie successive **non ancora fatte** che avevano lo stesso peso di prima prendono il nuovo valore. Quelle con un peso diverso (piramidi, riscaldamento) non cambiano.
- Cambia solo il peso, mai le ripetizioni. Con − e + la copia è immediata. Scrivendo a mano avviene quando esci dal campo o premi invio.
- Riguarda solo l'allenamento in corso, non la scheda né lo storico.
- Le serie aggiornate lampeggiano per mezzo secondo (senza animazione se il telefono è impostato su "Riduci movimento").
- Si disattiva in **Storico → Impostazioni → Copia il peso alle serie successive** (acceso di default). L'impostazione è inclusa nel backup.

## Ripeti ultimo allenamento

- In **Oggi** ogni scheda ha due pulsanti:
  - **Inizia** parte con i valori previsti dalla scheda.
  - **Ripeti ultimo** copia esercizi (con il loro `exerciseId`) e serie dell'ultima sessione registrata con quella scheda, con i kg e le ripetizioni effettivamente fatti.
- **Allenamento libero** ha **Ripeti ultimo allenamento**, che copia l'ultima sessione in assoluto, di qualsiasi scheda.
- Tutte le serie partono non segnate. La data è quella di oggi e l'id è nuovo: la sessione di origine non viene toccata.
- Recupero e timer degli esercizi vengono dalla scheda.
- Dopo l'avvio si modifica tutto come in un allenamento normale.
- Se una scheda non ha ancora sessioni, il pulsante è disattivato con scritto "Nessun allenamento precedente".

## Pulsanti − e + dei kg

- Ogni serie ha i pulsanti **−** e **+** per i kg. Il campo resta modificabile a mano e il valore non scende sotto 0.
- Il passo si sceglie in **Storico → Impostazioni → Passo peso (kg)**: 1, 2,5 o 5 (predefinito 2,5).
- Fino a 429 px di larghezza (la maggior parte degli iPhone) i pulsanti stanno **sotto** il campo kg; sugli schermi più larghi stanno **accanto**. Restano sempre di almeno 44×44 px.
- I kg si possono scrivere con la virgola o con il punto. Vengono mostrati senza zeri inutili: 60 e non 60,0; 62,5 se serve.

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
- Lo stesso interruttore c'è anche nel dettaglio del selettore (prima di **Aggiungi**), sia per le schede sia durante l'allenamento, e su ogni esercizio dell'allenamento in corso (**Timer esercizio**). Quest'ultimo vale solo per quell'allenamento e non modifica la scheda.
- Gli esercizi della libreria segnati "a tempo" partono con il timer acceso a 30 secondi; tutti gli altri partono spenti, ma l'interruttore c'è sempre.
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
- **Versione 7:** ogni esercizio delle sessioni (e dell'allenamento in corso) ha `note`, al massimo 500 caratteri; i dati vecchi hanno nota vuota. Prima della conversione si salva una copia delle sessioni (`diarioPalestra.sessions.v6`).
- **Versione 6:** ogni esercizio di schede e sessioni ha `exerciseId` (id della libreria oppure `custom-…`) più `name`, cioè il nome al momento. Nuova raccolta `customExercises` per gli esercizi personalizzati. Vedi "Libreria esercizi" più sotto.
- **Versione 5:** impostazioni `settings: {weightStep}`, cioè il passo dei pulsanti − e + dei kg (1, 2,5 o 5; predefinito 2,5). Sono incluse nei backup.
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
