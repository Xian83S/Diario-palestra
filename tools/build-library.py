"""Genera data/esercizi.json, la libreria di esercizi dell'app.

Testi scritti per questo progetto (nessun dataset esterno).
Uso:  python3 tools/build-library.py
Regole: gli `id` NON si cambiano mai (sono usati da schede e storico);
per correggere un testo modifica qui e rigenera. Se aggiungi o cambi
esercizi, aumenta LIBRARY_VERSION.
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

LIBRARY_VERSION = 2  # 2: aggiunto "dead-hang" (a tempo)
OUT = Path(__file__).resolve().parent.parent / "data" / "esercizi.json"

BODY_PARTS = ["Petto", "Schiena", "Spalle", "Bicipiti", "Tricipiti", "Quadricipiti",
              "Femorali", "Glutei", "Polpacci", "Core", "Corpo intero/Cardio"]
EQUIPMENT = ["bilanciere", "manubri", "macchina", "cavi", "corpo libero", "kettlebell", "elastici", "altro"]

# (id, nome, alias, parte, muscoli principali, secondari, attrezzo, istruzioni[, a tempo])
E = []
def ex(id_, name, aliases, part, muscles, secondary, equipment, instructions, timed=False):
    E.append(dict(id=id_, name=name, aliases=aliases, bodyPart=part, muscles=muscles,
                  secondary=secondary, equipment=equipment, instructions=instructions, timed=timed))

PET, DOR, SPA, BIC, TRI = "Petto", "Schiena", "Spalle", "Bicipiti", "Tricipiti"
QUA, FEM, GLU, POL, CORE, CARD = "Quadricipiti", "Femorali", "Glutei", "Polpacci", "Core", "Corpo intero/Cardio"

# ------------------------------------------------------------------ PETTO
ex("panca-piana-bilanciere", "Panca piana con bilanciere", ["Panca piana", "Bench press", "Distensioni su panca piana"], PET,
   ["Grande pettorale"], ["Deltoide anteriore", "Tricipite"], "bilanciere",
   "Sdraiati sulla panca con i piedi a terra e le scapole strette. Abbassa il bilanciere fino a sfiorare il petto all'altezza dei capezzoli, poi spingi in alto senza staccare i glutei.")
ex("panca-inclinata-bilanciere", "Panca inclinata con bilanciere", ["Incline bench press", "Panca inclinata"], PET,
   ["Grande pettorale (fasci alti)"], ["Deltoide anteriore", "Tricipite"], "bilanciere",
   "Regola lo schienale a 30-45 gradi. Porta il bilanciere verso la parte alta del petto con i gomiti leggermente chiusi e risali in modo controllato.")
ex("panca-declinata-bilanciere", "Panca declinata con bilanciere", ["Decline bench press", "Panca declinata"], PET,
   ["Grande pettorale (fasci bassi)"], ["Tricipite", "Deltoide anteriore"], "bilanciere",
   "Blocca le gambe nei rulli della panca declinata. Scendi verso la parte bassa del petto e spingi fino a braccia quasi tese.")
ex("panca-piana-manubri", "Panca piana con manubri", ["Dumbbell bench press", "Distensioni con manubri"], PET,
   ["Grande pettorale"], ["Deltoide anteriore", "Tricipite"], "manubri",
   "Parti con i manubri sopra il petto e i palmi in avanti. Scendi finché i gomiti sono poco sotto la panca e risali avvicinando i manubri senza farli sbattere.")
ex("spinte-manubri-panca-inclinata", "Spinte con manubri su panca inclinata", ["Spinte manubri panca inclinata", "Incline dumbbell press", "Panca inclinata manubri"], PET,
   ["Grande pettorale (fasci alti)"], ["Deltoide anteriore", "Tricipite"], "manubri",
   "Con lo schienale a 30-45 gradi, abbassa i manubri ai lati della parte alta del petto. Spingi verso l'alto e leggermente verso l'interno mantenendo le scapole addotte.")
ex("croci-manubri-panca-piana", "Croci con manubri su panca piana", ["Croci manubri", "Dumbbell fly", "Croci su panca"], PET,
   ["Grande pettorale"], ["Deltoide anteriore"], "manubri",
   "Tieni i gomiti leggermente piegati e fissi per tutto il movimento. Apri le braccia ad arco finché senti l'allungamento del petto, poi richiudile come per abbracciare un albero.")
ex("croci-manubri-panca-inclinata", "Croci con manubri su panca inclinata", ["Incline dumbbell fly", "Croci inclinate"], PET,
   ["Grande pettorale (fasci alti)"], ["Deltoide anteriore"], "manubri",
   "Su panca a 30 gradi apri le braccia ad arco con i gomiti morbidi. Fermati quando le mani sono all'altezza delle spalle e risali lentamente.")
ex("croci-ai-cavi", "Croci ai cavi", ["Cable crossover", "Croci cavi in piedi", "Cable fly"], PET,
   ["Grande pettorale"], ["Deltoide anteriore"], "cavi",
   "Con le carrucole in alto, fai un passo avanti e inclina leggermente il busto. Porta le maniglie davanti al bacino con un arco ampio e torna indietro controllando.")
ex("croci-cavi-basso-alto", "Croci ai cavi dal basso verso l'alto", ["Low to high cable fly", "Croci cavi dal basso"], PET,
   ["Grande pettorale (fasci alti)"], ["Deltoide anteriore"], "cavi",
   "Con le carrucole in basso, porta le maniglie verso l'alto fino all'altezza del mento. Tieni i gomiti morbidi e il busto fermo.")
ex("chest-press-macchina", "Chest press alla macchina", ["Chest press", "Distensioni alla macchina"], PET,
   ["Grande pettorale"], ["Deltoide anteriore", "Tricipite"], "macchina",
   "Regola il sedile in modo che le maniglie siano all'altezza del petto. Spingi in avanti senza bloccare i gomiti e torna indietro lentamente.")
ex("pectoral-machine", "Pectoral machine", ["Pec deck", "Butterfly", "Croci alla macchina"], PET,
   ["Grande pettorale"], ["Deltoide anteriore"], "macchina",
   "Siediti con la schiena appoggiata e i gomiti all'altezza delle spalle. Chiudi le braccia davanti al petto stringendo i pettorali e riapri senza far sbattere i pesi.")
ex("piegamenti", "Piegamenti sulle braccia", ["Push up", "Flessioni", "Piegamenti"], PET,
   ["Grande pettorale"], ["Tricipite", "Deltoide anteriore", "Core"], "corpo libero",
   "Mani poco più larghe delle spalle e corpo dritto dalla testa ai talloni. Scendi finché il petto è vicino al pavimento e spingi tornando su senza far cadere il bacino.")
ex("piegamenti-inclinati", "Piegamenti con mani rialzate", ["Incline push up", "Flessioni inclinate"], PET,
   ["Grande pettorale (fasci bassi)"], ["Tricipite", "Deltoide anteriore"], "corpo libero",
   "Appoggia le mani su una panca o un rialzo. Mantieni il corpo rigido e porta il petto verso il bordo, poi spingi via. È la versione più facile dei piegamenti.")
ex("piegamenti-declinati", "Piegamenti con piedi rialzati", ["Decline push up", "Flessioni declinate"], PET,
   ["Grande pettorale (fasci alti)"], ["Deltoide anteriore", "Tricipite"], "corpo libero",
   "Appoggia i piedi su una panca e le mani a terra. Scendi controllando e risali tenendo addome e glutei contratti.")
ex("dip-parallele-petto", "Dip alle parallele (petto)", ["Dip", "Dips", "Chest dip", "Parallele"], PET,
   ["Grande pettorale (fasci bassi)"], ["Tricipite", "Deltoide anteriore"], "corpo libero",
   "Inclina il busto in avanti e lascia i gomiti un po' aperti. Scendi finché le spalle sono poco sotto i gomiti e risali spingendo sulle parallele.")
ex("pullover-manubrio", "Pullover con manubrio", ["Pullover", "Dumbbell pullover"], PET,
   ["Grande pettorale"], ["Gran dorsale", "Tricipite (capo lungo)"], "manubri",
   "Sdraiati di traverso o lungo la panca tenendo un manubrio con due mani sopra il petto. Portalo dietro la testa con i gomiti leggermente piegati e riportalo sopra il petto.")
ex("svend-press", "Svend press", ["Plate press", "Spinta con disco"], PET,
   ["Grande pettorale (fasci interni)"], ["Deltoide anteriore"], "altro",
   "Stringi un disco tra i palmi davanti al petto. Spingi le mani in avanti premendo forte il disco e riportalo al petto senza smettere di stringere.")
ex("panca-piana-multipower", "Panca piana al multipower", ["Smith machine bench press", "Panca al multipower"], PET,
   ["Grande pettorale"], ["Tricipite", "Deltoide anteriore"], "macchina",
   "Posiziona la panca in modo che il bilanciere guidato scenda sulla parte media del petto. Sblocca, scendi controllando e spingi in alto.")

# ------------------------------------------------------------------ SCHIENA
ex("trazioni-presa-prona", "Trazioni alla sbarra", ["Trazioni", "Pull up", "Trazioni presa prona"], DOR,
   ["Gran dorsale"], ["Bicipite", "Romboidi", "Trapezio inferiore"], "corpo libero",
   "Afferra la sbarra con i palmi in avanti, poco più larghi delle spalle. Tira il petto verso la sbarra portando i gomiti verso i fianchi e scendi fino a braccia distese.")
ex("trazioni-presa-supina", "Trazioni presa supina", ["Chin up", "Trazioni inverse"], DOR,
   ["Gran dorsale", "Bicipite"], ["Brachiale", "Romboidi"], "corpo libero",
   "Afferra la sbarra con i palmi verso di te alla larghezza delle spalle. Sali finché il mento supera la sbarra e scendi lentamente.")
ex("trazioni-assistite", "Trazioni assistite", ["Assisted pull up", "Trazioni con elastico", "Trazioni alla macchina"], DOR,
   ["Gran dorsale"], ["Bicipite", "Romboidi"], "macchina",
   "Usa la macchina o un elastico per scaricare parte del peso. Esegui la trazione completa portando il petto verso la sbarra e scendi controllando.")
ex("lat-machine-avanti", "Lat machine avanti", ["Lat machine", "Lat pulldown", "Pulldown"], DOR,
   ["Gran dorsale"], ["Bicipite", "Romboidi", "Deltoide posteriore"], "macchina",
   "Siediti con le cosce bloccate e afferra la barra larga. Tirala verso la parte alta del petto inclinando appena il busto indietro e accompagnala in risalita.")
ex("lat-machine-presa-stretta", "Lat machine presa stretta", ["Close grip pulldown", "Lat machine triangolo"], DOR,
   ["Gran dorsale"], ["Bicipite", "Romboidi"], "macchina",
   "Usa il triangolo o una presa stretta neutra. Tira verso lo sterno portando i gomiti in basso vicino al corpo e risali fino a sentire l'allungamento.")
ex("pulley-basso", "Pulley basso", ["Pulley", "Seated cable row", "Rematore ai cavi seduto"], DOR,
   ["Gran dorsale", "Romboidi"], ["Bicipite", "Trapezio", "Deltoide posteriore"], "cavi",
   "Siediti con le gambe leggermente piegate e la schiena dritta. Tira la maniglia verso l'ombelico stringendo le scapole e torna in avanti senza arrotondare la schiena.")
ex("rematore-bilanciere", "Rematore con bilanciere", ["Rematore bilanciere", "Barbell row", "Bent over row"], DOR,
   ["Gran dorsale", "Romboidi"], ["Trapezio", "Bicipite", "Erettori spinali"], "bilanciere",
   "Piega il busto in avanti a circa 45 gradi con la schiena neutra e le ginocchia morbide. Tira il bilanciere verso l'ombelico e abbassalo fino a braccia tese.")
ex("rematore-manubrio", "Rematore con manubrio", ["Rematore manubrio", "One arm dumbbell row", "Rematore a un braccio"], DOR,
   ["Gran dorsale"], ["Romboidi", "Bicipite", "Deltoide posteriore"], "manubri",
   "Appoggia mano e ginocchio sulla panca e tieni la schiena piatta. Tira il manubrio verso il fianco con il gomito vicino al corpo e scendi allungando.")
ex("rematore-t-bar", "Rematore T-bar", ["T-bar row", "Rematore con landmine"], DOR,
   ["Gran dorsale", "Romboidi"], ["Trapezio", "Bicipite"], "bilanciere",
   "Mettiti a cavallo del bilanciere ancorato con il busto inclinato. Tira la maniglia verso il petto e scendi controllando senza arrotondare la schiena.")
ex("rematore-macchina", "Rematore alla macchina", ["Machine row", "Low row"], DOR,
   ["Gran dorsale", "Romboidi"], ["Bicipite", "Deltoide posteriore"], "macchina",
   "Appoggia il petto al supporto e afferra le maniglie. Tira indietro i gomiti stringendo le scapole e torna in avanti lentamente.")
ex("rematore-pendlay", "Rematore Pendlay", ["Pendlay row"], DOR,
   ["Gran dorsale", "Romboidi"], ["Trapezio", "Erettori spinali"], "bilanciere",
   "Busto quasi parallelo al pavimento e bilanciere fermo a terra a ogni ripetizione. Strappalo verso la parte bassa del petto e riappoggialo.")
ex("rematore-inverso", "Rematore inverso", ["Inverted row", "Australian pull up"], DOR,
   ["Gran dorsale", "Romboidi"], ["Bicipite", "Deltoide posteriore"], "corpo libero",
   "Sdraiati sotto una sbarra bassa o anelli con il corpo rigido. Tira il petto verso la sbarra e scendi a braccia tese.")
ex("stacco-da-terra", "Stacco da terra", ["Stacco", "Deadlift", "Stacco classico"], DOR,
   ["Erettori spinali", "Grande gluteo", "Femorali"], ["Quadricipite", "Trapezio", "Avambracci"], "bilanciere",
   "Piedi alla larghezza dei fianchi e bilanciere sopra il centro del piede. Con la schiena neutra spingi il pavimento con le gambe e porta su il bilanciere vicino alle tibie fino a essere in piedi.")
ex("pullover-cavo", "Pullover al cavo", ["Straight arm pulldown", "Pulldown a braccia tese"], DOR,
   ["Gran dorsale"], ["Tricipite (capo lungo)", "Grande rotondo"], "cavi",
   "In piedi davanti al cavo alto con la barra in mano e le braccia quasi tese. Spingi la barra verso le cosce con un arco e risali controllando.")
ex("hyperextension", "Iperestensioni", ["Hyperextension", "Back extension", "Estensioni lombari"], DOR,
   ["Erettori spinali"], ["Grande gluteo", "Femorali"], "macchina",
   "Sulla panca a 45 gradi blocca i talloni e appoggia il bacino al cuscino. Scendi piegandoti in avanti e risali fino ad allineare il busto con le gambe, senza inarcare.")
ex("good-morning", "Good morning", ["Good morning con bilanciere"], DOR,
   ["Erettori spinali", "Femorali"], ["Grande gluteo"], "bilanciere",
   "Bilanciere sulle spalle e ginocchia morbide. Spingi il bacino indietro piegando il busto con la schiena neutra e torna su contraendo i glutei.")
ex("scrollate-bilanciere", "Scrollate con bilanciere", ["Shrug", "Barbell shrug", "Scrollate"], DOR,
   ["Trapezio superiore"], ["Elevatore della scapola"], "bilanciere",
   "In piedi con il bilanciere davanti alle cosce e le braccia tese. Solleva le spalle verso le orecchie, tieni un attimo e scendi senza ruotarle.")
ex("scrollate-manubri", "Scrollate con manubri", ["Dumbbell shrug"], DOR,
   ["Trapezio superiore"], ["Elevatore della scapola"], "manubri",
   "Tieni i manubri ai fianchi con le braccia tese. Alza le spalle in verticale, fai una breve pausa in alto e scendi lentamente.")
ex("rematore-cavo-unilaterale", "Rematore al cavo a un braccio", ["Single arm cable row"], DOR,
   ["Gran dorsale"], ["Romboidi", "Bicipite"], "cavi",
   "Afferra la maniglia con una mano e porta il gomito indietro vicino al corpo. Lascia che la spalla vada avanti al ritorno per allungare bene il dorso.")
ex("rack-pull", "Rack pull", ["Stacco dai fermi"], DOR,
   ["Erettori spinali", "Trapezio"], ["Grande gluteo", "Femorali"], "bilanciere",
   "Appoggia il bilanciere sui fermi all'altezza delle ginocchia. Tiralo su estendendo le anche con la schiena neutra e riappoggialo controllando.")

# ------------------------------------------------------------------ SPALLE
ex("lento-avanti-bilanciere", "Lento avanti con bilanciere", ["Military press", "Overhead press", "Lento avanti"], SPA,
   ["Deltoide anteriore"], ["Deltoide laterale", "Tricipite", "Trapezio"], "bilanciere",
   "In piedi con il bilanciere appoggiato sulle clavicole e i glutei contratti. Spingilo sopra la testa passando vicino al viso e torna alla posizione di partenza.")
ex("lento-avanti-manubri", "Lento avanti con manubri", ["Lento avanti manubri", "Dumbbell shoulder press", "Shoulder press manubri"], SPA,
   ["Deltoide anteriore"], ["Deltoide laterale", "Tricipite"], "manubri",
   "Seduto con lo schienale verticale, parti con i manubri all'altezza delle orecchie. Spingi in alto fino quasi a toccarli e scendi controllando.")
ex("arnold-press", "Arnold press", ["Lento Arnold"], SPA,
   ["Deltoide anteriore"], ["Deltoide laterale", "Tricipite"], "manubri",
   "Parti con i manubri davanti al viso e i palmi verso di te. Mentre spingi in alto ruota i polsi fino ad avere i palmi in avanti, poi ripeti al contrario scendendo.")
ex("shoulder-press-macchina", "Shoulder press alla macchina", ["Shoulder press", "Spinte spalle alla macchina"], SPA,
   ["Deltoide anteriore"], ["Deltoide laterale", "Tricipite"], "macchina",
   "Regola il sedile in modo che le maniglie partano all'altezza delle spalle. Spingi in alto senza bloccare i gomiti e torna giù lentamente.")
ex("alzate-laterali-manubri", "Alzate laterali con manubri", ["Alzate laterali", "Lateral raise", "Laterali"], SPA,
   ["Deltoide laterale"], ["Trapezio superiore", "Deltoide anteriore"], "manubri",
   "In piedi con i manubri ai fianchi e i gomiti leggermente piegati. Solleva le braccia di lato fino all'altezza delle spalle, senza slanci, e scendi lentamente.")
ex("alzate-laterali-cavo", "Alzate laterali al cavo", ["Cable lateral raise"], SPA,
   ["Deltoide laterale"], ["Trapezio superiore"], "cavi",
   "Afferra la maniglia del cavo basso con la mano opposta. Solleva il braccio di lato fino all'altezza della spalla e torna giù mantenendo la tensione.")
ex("alzate-frontali-manubri", "Alzate frontali con manubri", ["Front raise", "Alzate frontali"], SPA,
   ["Deltoide anteriore"], ["Grande pettorale (fasci alti)"], "manubri",
   "Solleva i manubri davanti a te con i gomiti morbidi fino all'altezza degli occhi. Scendi controllando senza oscillare con il busto.")
ex("alzate-posteriori-manubri", "Alzate posteriori con manubri", ["Reverse fly", "Alzate a 90 gradi", "Rear delt fly"], SPA,
   ["Deltoide posteriore"], ["Romboidi", "Trapezio medio"], "manubri",
   "Piega il busto in avanti quasi parallelo al pavimento. Apri le braccia di lato con i gomiti morbidi fino all'altezza delle spalle e scendi lentamente.")
ex("reverse-pec-deck", "Croci inverse alla macchina", ["Reverse pec deck", "Rear delt machine"], SPA,
   ["Deltoide posteriore"], ["Romboidi", "Trapezio medio"], "macchina",
   "Siediti rivolto verso lo schienale della pectoral machine. Apri le braccia all'indietro con i gomiti morbidi e torna in avanti controllando.")
ex("face-pull", "Face pull", ["Face pull ai cavi", "Tirate al viso"], SPA,
   ["Deltoide posteriore"], ["Trapezio medio", "Romboidi", "Cuffia dei rotatori"], "cavi",
   "Con la corda all'altezza del viso, tira verso la fronte aprendo le mani ai lati della testa. Tieni i gomiti alti e torna avanti lentamente.")
ex("tirate-al-mento", "Tirate al mento", ["Upright row", "Tirate al mento con bilanciere"], SPA,
   ["Deltoide laterale", "Trapezio superiore"], ["Bicipite"], "bilanciere",
   "Presa poco più larga delle spalle. Tira il bilanciere lungo il corpo fino al petto con i gomiti che guidano verso l'alto, senza superare l'altezza delle spalle.")
ex("pike-push-up", "Pike push up", ["Piegamenti a V", "Piegamenti per le spalle"], SPA,
   ["Deltoide anteriore"], ["Tricipite", "Trapezio"], "corpo libero",
   "Parti in posizione a V rovesciata con i fianchi in alto. Piega i gomiti portando la testa verso il pavimento tra le mani e spingi per tornare su.")
ex("landmine-press", "Landmine press", ["Spinta con landmine"], SPA,
   ["Deltoide anteriore"], ["Grande pettorale (fasci alti)", "Tricipite", "Core"], "bilanciere",
   "Tieni l'estremità del bilanciere ancorato all'altezza della spalla. Spingila in avanti e in alto fino a braccio teso e riportala giù controllando.")
ex("rotazione-esterna-cavo", "Rotazione esterna al cavo", ["External rotation", "Extrarotazioni"], SPA,
   ["Cuffia dei rotatori"], ["Deltoide posteriore"], "cavi",
   "Gomito piegato a 90 gradi e attaccato al fianco. Ruota l'avambraccio verso l'esterno senza staccare il gomito e torna lentamente.")
ex("alzate-laterali-macchina", "Alzate laterali alla macchina", ["Lateral raise machine"], SPA,
   ["Deltoide laterale"], ["Trapezio superiore"], "macchina",
   "Appoggia le braccia sui cuscinetti con le spalle allineate al perno. Solleva fino all'altezza delle spalle e scendi senza far toccare i pesi.")
ex("y-raise", "Alzate a Y", ["Y raise", "Alzate a Y su panca inclinata"], SPA,
   ["Deltoide posteriore", "Trapezio inferiore"], ["Deltoide laterale"], "manubri",
   "Petto appoggiato a una panca inclinata e manubri leggeri. Solleva le braccia in avanti e in fuori formando una Y con i pollici verso l'alto.")
ex("lento-dietro", "Lento dietro con bilanciere", ["Behind the neck press", "Lento dietro"], SPA,
   ["Deltoide anteriore", "Deltoide laterale"], ["Tricipite", "Trapezio"], "bilanciere",
   "Seduto con il bilanciere sulle spalle dietro la nuca. Spingi in alto fino a braccia tese e scendi solo fino a dove le spalle restano comode.")

# ------------------------------------------------------------------ BICIPITI
ex("curl-bilanciere", "Curl con bilanciere", ["Curl bilanciere", "Barbell curl"], BIC,
   ["Bicipite"], ["Brachiale", "Brachioradiale"], "bilanciere",
   "In piedi con i gomiti fermi ai fianchi e la presa supina. Piega le braccia portando il bilanciere verso le spalle e scendi fino a braccia distese senza dondolare.")
ex("curl-bilanciere-ez", "Curl con bilanciere EZ", ["Curl EZ", "EZ bar curl"], BIC,
   ["Bicipite"], ["Brachiale", "Brachioradiale"], "bilanciere",
   "Afferra il bilanciere sagomato sulla curva interna. Esegui il curl con i gomiti fermi e scendi lentamente: la presa angolata è più comoda per i polsi.")
ex("curl-manubri", "Curl con manubri", ["Curl manubri", "Dumbbell curl", "Curl alternato"], BIC,
   ["Bicipite"], ["Brachiale", "Brachioradiale"], "manubri",
   "Parti con i palmi rivolti al corpo e ruotali verso l'alto mentre sollevi. Porta il manubrio alla spalla e scendi controllando, a braccia alternate o insieme.")
ex("curl-martello", "Curl a martello", ["Hammer curl", "Curl hammer"], BIC,
   ["Brachiale", "Brachioradiale"], ["Bicipite"], "manubri",
   "Tieni i manubri con presa neutra, pollici verso l'alto. Piega i gomiti senza ruotare i polsi e torna giù lentamente.")
ex("curl-panca-inclinata", "Curl su panca inclinata", ["Incline dumbbell curl", "Curl inclinato"], BIC,
   ["Bicipite (capo lungo)"], ["Brachiale"], "manubri",
   "Siediti su una panca a 45-60 gradi con le braccia che pendono dietro il busto. Fletti i gomiti senza portarli avanti e scendi fino all'allungamento completo.")
ex("curl-concentrato", "Curl concentrato", ["Concentration curl"], BIC,
   ["Bicipite"], ["Brachiale"], "manubri",
   "Seduto, appoggia il gomito all'interno della coscia. Porta il manubrio verso la spalla stringendo il bicipite in alto e scendi lentamente.")
ex("curl-panca-scott", "Curl alla panca Scott", ["Preacher curl", "Panca Scott"], BIC,
   ["Bicipite"], ["Brachiale"], "bilanciere",
   "Appoggia la parte posteriore delle braccia sul cuscino inclinato. Solleva il bilanciere EZ senza staccare i gomiti e scendi fin quasi a braccia tese.")
ex("curl-cavo", "Curl al cavo", ["Cable curl", "Curl ai cavi"], BIC,
   ["Bicipite"], ["Brachiale", "Brachioradiale"], "cavi",
   "Afferra la barra del cavo basso con presa supina. Esegui il curl con i gomiti fermi: il cavo mantiene la tensione anche in basso.")
ex("curl-macchina", "Curl alla macchina", ["Biceps curl machine"], BIC,
   ["Bicipite"], ["Brachiale"], "macchina",
   "Regola il sedile in modo che i gomiti siano allineati al perno. Fletti le braccia stringendo in alto e torna lentamente.")
ex("curl-inverso", "Curl inverso", ["Reverse curl", "Curl presa prona"], BIC,
   ["Brachioradiale", "Brachiale"], ["Bicipite", "Avambracci"], "bilanciere",
   "Afferra il bilanciere con i palmi verso il basso. Fletti i gomiti tenendo i polsi dritti e scendi controllando.")
ex("curl-elastico", "Curl con elastico", ["Band curl"], BIC,
   ["Bicipite"], ["Brachiale"], "elastici",
   "Blocca l'elastico sotto i piedi e afferra le estremità con i palmi in avanti. Piega i gomiti fino alle spalle e scendi senza perdere la tensione.")
ex("curl-spider", "Spider curl", ["Curl a petto in giù"], BIC,
   ["Bicipite"], ["Brachiale"], "manubri",
   "Sdraiati a pancia in giù su una panca inclinata con le braccia verticali verso terra. Fletti i gomiti portando i manubri verso le spalle e scendi lentamente.")

# ------------------------------------------------------------------ TRICIPITI
ex("push-down-cavo", "Push down al cavo", ["Push down ai cavi", "Pushdown", "Tricipiti al cavo", "Spinte in basso al cavo"], TRI,
   ["Tricipite"], [], "cavi",
   "In piedi davanti al cavo alto con la barra in mano e i gomiti ai fianchi. Spingi verso il basso fino a braccia tese e risali solo fino a 90 gradi.")
ex("push-down-corda", "Push down con corda", ["Rope pushdown", "Pushdown corda"], TRI,
   ["Tricipite"], [], "cavi",
   "Usa la corda e tieni i gomiti fermi. In fondo al movimento apri le mani verso l'esterno per contrarre di più, poi risali controllando.")
ex("french-press", "French press", ["Skull crusher", "French press bilanciere EZ", "Estensioni da sdraiato"], TRI,
   ["Tricipite"], [], "bilanciere",
   "Sdraiato sulla panca con il bilanciere EZ sopra il petto. Piega solo i gomiti portando il bilanciere verso la fronte e torna a braccia tese.")
ex("estensioni-sopra-testa-manubrio", "Estensioni sopra la testa con manubrio", ["Overhead triceps extension", "Estensioni tricipiti manubrio"], TRI,
   ["Tricipite (capo lungo)"], [], "manubri",
   "Tieni un manubrio con due mani sopra la testa. Abbassalo dietro la nuca piegando i gomiti, che restano vicini alla testa, e torna su.")
ex("estensioni-sopra-testa-cavo", "Estensioni sopra la testa al cavo", ["Overhead cable extension"], TRI,
   ["Tricipite (capo lungo)"], [], "cavi",
   "Di spalle al cavo con la corda dietro la testa. Spingi le mani in avanti e in alto fino a distendere le braccia e torna indietro lentamente.")
ex("dip-panca", "Dip su panca", ["Bench dip", "Dip tra due panche"], TRI,
   ["Tricipite"], ["Deltoide anteriore", "Grande pettorale"], "corpo libero",
   "Mani sul bordo della panca dietro di te e gambe avanti. Scendi piegando i gomiti all'indietro fino a circa 90 gradi e spingi per risalire.")
ex("dip-parallele-tricipiti", "Dip alle parallele (tricipiti)", ["Triceps dip"], TRI,
   ["Tricipite"], ["Grande pettorale", "Deltoide anteriore"], "corpo libero",
   "Busto verticale e gomiti stretti vicino al corpo. Scendi fino a 90 gradi di flessione e spingi fino a braccia tese.")
ex("panca-presa-stretta", "Panca piana presa stretta", ["Close grip bench press", "Panca stretta"], TRI,
   ["Tricipite"], ["Grande pettorale", "Deltoide anteriore"], "bilanciere",
   "Presa alla larghezza delle spalle e gomiti vicini al corpo. Scendi verso la parte bassa del petto e spingi concentrandoti sui tricipiti.")
ex("kickback-manubrio", "Kickback con manubrio", ["Triceps kickback", "Estensioni a busto piegato"], TRI,
   ["Tricipite"], [], "manubri",
   "Busto inclinato in avanti e braccio parallelo al corpo. Distendi il gomito portando il manubrio indietro e torna senza muovere la spalla.")
ex("piegamenti-presa-stretta", "Piegamenti presa stretta", ["Diamond push up", "Piegamenti a diamante"], TRI,
   ["Tricipite"], ["Grande pettorale", "Deltoide anteriore"], "corpo libero",
   "Mani vicine sotto il petto, con pollici e indici che formano un triangolo. Scendi con i gomiti stretti e spingi fino a braccia tese.")
ex("dip-macchina", "Dip alla macchina", ["Triceps dip machine", "Spinte tricipiti alla macchina"], TRI,
   ["Tricipite"], ["Grande pettorale"], "macchina",
   "Siediti con la schiena appoggiata e afferra le maniglie ai fianchi. Spingi verso il basso fino a braccia tese e risali controllando.")
ex("estensioni-elastico", "Estensioni tricipiti con elastico", ["Band pushdown"], TRI,
   ["Tricipite"], [], "elastici",
   "Fissa l'elastico in alto e tieni i gomiti ai fianchi. Spingi le mani verso il basso fino a braccia tese e torna lentamente.")

# ------------------------------------------------------------------ QUADRICIPITI
ex("squat-bilanciere", "Squat con bilanciere", ["Squat", "Back squat", "Squat bilanciere"], QUA,
   ["Quadricipite", "Grande gluteo"], ["Adduttori", "Erettori spinali", "Femorali"], "bilanciere",
   "Bilanciere sui trapezi e piedi alla larghezza delle spalle. Scendi spingendo indietro i fianchi e aprendo le ginocchia sulla linea delle punte, poi risali con la schiena neutra.")
ex("front-squat", "Front squat", ["Squat frontale"], QUA,
   ["Quadricipite"], ["Grande gluteo", "Core"], "bilanciere",
   "Bilanciere appoggiato davanti sulle spalle con i gomiti alti. Scendi tenendo il busto il più verticale possibile e risali spingendo sui talloni.")
ex("goblet-squat", "Goblet squat", ["Squat con manubrio", "Squat con kettlebell"], QUA,
   ["Quadricipite", "Grande gluteo"], ["Core", "Adduttori"], "kettlebell",
   "Tieni il kettlebell o un manubrio contro il petto. Scendi tra le ginocchia mantenendo il busto alto e risali spingendo sui piedi.")
ex("squat-corpo-libero", "Squat a corpo libero", ["Air squat", "Bodyweight squat"], QUA,
   ["Quadricipite", "Grande gluteo"], ["Femorali", "Core"], "corpo libero",
   "Piedi alla larghezza delle spalle e braccia avanti per l'equilibrio. Scendi finché le cosce sono parallele al pavimento e torna su.")
ex("leg-press", "Leg press 45°", ["Pressa", "Leg press", "Pressa 45"], QUA,
   ["Quadricipite", "Grande gluteo"], ["Femorali", "Adduttori"], "macchina",
   "Schiena e bacino ben appoggiati, piedi a metà pedana. Scendi finché le ginocchia arrivano verso il petto senza che il bacino si stacchi e spingi senza bloccare le ginocchia.")
ex("hack-squat", "Hack squat", ["Hack squat alla macchina"], QUA,
   ["Quadricipite"], ["Grande gluteo"], "macchina",
   "Spalle sotto i cuscinetti e schiena appoggiata. Scendi piegando le ginocchia fino ad almeno 90 gradi e risali spingendo con tutto il piede.")
ex("leg-extension", "Leg extension", ["Estensioni gambe", "Leg extension alla macchina"], QUA,
   ["Quadricipite"], [], "macchina",
   "Regola lo schienale in modo che le ginocchia siano allineate al perno. Distendi le gambe fino in alto, tieni un attimo e scendi lentamente.")
ex("affondi-manubri", "Affondi con manubri", ["Affondi", "Lunges", "Affondi in avanti"], QUA,
   ["Quadricipite", "Grande gluteo"], ["Femorali", "Adduttori"], "manubri",
   "Fai un passo avanti e scendi finché entrambe le ginocchia sono a circa 90 gradi. Spingi sul piede davanti per tornare in piedi e alterna le gambe.")
ex("affondi-camminati", "Affondi camminati", ["Walking lunges", "Affondi in camminata"], QUA,
   ["Quadricipite", "Grande gluteo"], ["Femorali", "Core"], "manubri",
   "Esegui un affondo e, invece di tornare indietro, porta avanti la gamba dietro per il passo successivo. Mantieni il busto dritto e i passi lunghi.")
ex("affondi-indietro", "Affondi indietro", ["Reverse lunges", "Affondi all'indietro"], QUA,
   ["Quadricipite", "Grande gluteo"], ["Femorali"], "manubri",
   "Fai un passo indietro e scendi con il ginocchio posteriore verso terra. Spingi sul piede davanti per tornare alla posizione di partenza: è più gentile per le ginocchia.")
ex("bulgarian-split-squat", "Bulgarian split squat", ["Squat bulgaro", "Affondi bulgari", "Split squat bulgaro"], QUA,
   ["Quadricipite", "Grande gluteo"], ["Adduttori", "Femorali"], "manubri",
   "Appoggia il collo del piede posteriore su una panca. Scendi in verticale sulla gamba anteriore finché la coscia è parallela al pavimento e risali.")
ex("step-up", "Step up", ["Salite sul gradino", "Step up con manubri"], QUA,
   ["Quadricipite", "Grande gluteo"], ["Femorali", "Polpacci"], "manubri",
   "Appoggia tutto il piede su un rialzo stabile. Sali spingendo con la gamba davanti senza darti lo slancio con quella dietro e scendi controllando.")
ex("sissy-squat", "Sissy squat", [], QUA,
   ["Quadricipite"], ["Core"], "corpo libero",
   "Reggiti a un supporto e sali sulle punte. Piega le ginocchia in avanti inclinando il corpo indietro in linea retta e risali contraendo le cosce.")
ex("squat-multipower", "Squat al multipower", ["Smith machine squat", "Squat guidato"], QUA,
   ["Quadricipite", "Grande gluteo"], ["Femorali"], "macchina",
   "Bilanciere guidato sui trapezi e piedi un po' avanti rispetto al corpo. Scendi controllando e spingi per risalire senza bloccare le ginocchia.")
ex("wall-sit", "Wall sit", ["Sedia al muro", "Squat isometrico al muro"], QUA,
   ["Quadricipite"], ["Grande gluteo"], "corpo libero",
   "Appoggia la schiena al muro e scendi finché le ginocchia sono a 90 gradi. Resta immobile per il tempo previsto respirando con calma.", True)
ex("pistol-squat", "Pistol squat", ["Squat su una gamba"], QUA,
   ["Quadricipite", "Grande gluteo"], ["Core", "Adduttori"], "corpo libero",
   "In equilibrio su una gamba con l'altra tesa in avanti. Scendi il più possibile mantenendo il tallone a terra e risali; all'inizio aiutati con un appoggio.")
ex("squat-sumo", "Squat sumo", ["Sumo squat", "Squat gambe larghe"], QUA,
   ["Quadricipite", "Adduttori"], ["Grande gluteo"], "manubri",
   "Piedi molto larghi e punte verso l'esterno, con un manubrio tenuto tra le gambe. Scendi con il busto dritto e risali stringendo glutei e interno coscia.")
ex("belt-squat", "Belt squat", ["Squat con cintura"], QUA,
   ["Quadricipite", "Grande gluteo"], ["Adduttori"], "macchina",
   "Aggancia la cintura al carico in modo che il peso stia sui fianchi e non sulla schiena. Esegui lo squat con il busto dritto e risali spingendo sui piedi.")

# ------------------------------------------------------------------ FEMORALI
ex("stacco-rumeno", "Stacco rumeno", ["Romanian deadlift", "RDL", "Stacco rumeno con bilanciere"], FEM,
   ["Femorali", "Grande gluteo"], ["Erettori spinali"], "bilanciere",
   "In piedi con il bilanciere davanti alle cosce e le ginocchia leggermente piegate. Spingi indietro i fianchi facendo scorrere il bilanciere lungo le gambe fino a metà tibia e risali.")
ex("stacco-rumeno-manubri", "Stacco rumeno con manubri", ["Dumbbell RDL"], FEM,
   ["Femorali", "Grande gluteo"], ["Erettori spinali"], "manubri",
   "Manubri davanti alle cosce e ginocchia morbide. Piega il busto spingendo indietro i fianchi con la schiena neutra e torna su contraendo i glutei.")
ex("stacco-gambe-tese", "Stacco a gambe tese", ["Stiff leg deadlift"], FEM,
   ["Femorali"], ["Grande gluteo", "Erettori spinali"], "bilanciere",
   "Ginocchia quasi tese e bilanciere che parte da terra o dai fianchi. Scendi tenendo la schiena dritta finché senti l'allungamento dei femorali e risali.")
ex("leg-curl-sdraiato", "Leg curl sdraiato", ["Leg curl", "Lying leg curl", "Leg curl prono"], FEM,
   ["Femorali"], ["Gastrocnemio"], "macchina",
   "Sdraiato a pancia in giù con il rullo sopra i talloni. Porta i talloni verso i glutei senza alzare il bacino e scendi lentamente.")
ex("leg-curl-seduto", "Leg curl seduto", ["Seated leg curl"], FEM,
   ["Femorali"], ["Gastrocnemio"], "macchina",
   "Siediti con il rullo sotto i polpacci e il cuscino fermo sulle cosce. Piega le ginocchia portando i talloni sotto la seduta e torna controllando.")
ex("nordic-curl", "Nordic curl", ["Nordic hamstring curl", "Curl nordico"], FEM,
   ["Femorali"], ["Grande gluteo"], "corpo libero",
   "In ginocchio con i talloni bloccati. Inclinati in avanti tenendo il corpo dritto il più lentamente possibile, poi aiutati con le mani per tornare su.")
ex("good-morning-elastico", "Good morning con elastico", ["Band good morning"], FEM,
   ["Femorali"], ["Erettori spinali", "Grande gluteo"], "elastici",
   "Elastico sotto i piedi e dietro il collo. Piegati in avanti spingendo indietro i fianchi con la schiena neutra e torna su.")
ex("leg-curl-fitball", "Leg curl con fitball", ["Stability ball leg curl", "Leg curl con palla"], FEM,
   ["Femorali"], ["Grande gluteo", "Core"], "altro",
   "Sdraiato a terra con i talloni sulla palla e i fianchi sollevati. Porta la palla verso i glutei piegando le ginocchia e allontanala senza far scendere il bacino.")
ex("stacco-una-gamba", "Stacco rumeno a una gamba", ["Single leg RDL", "Stacco monopodalico"], FEM,
   ["Femorali", "Grande gluteo"], ["Medio gluteo", "Core"], "manubri",
   "In equilibrio su una gamba con un manubrio nella mano opposta. Inclinati in avanti alzando la gamba libera dietro di te, mantieni i fianchi paralleli e torna su.")
ex("kettlebell-swing", "Kettlebell swing", ["Swing", "Slancio con kettlebell"], FEM,
   ["Femorali", "Grande gluteo"], ["Erettori spinali", "Core", "Deltoide anteriore"], "kettlebell",
   "Piedi larghi e kettlebell tra le gambe. Spingi i fianchi indietro e poi in avanti con forza per far salire il peso fino all'altezza del petto: la spinta viene dalle anche, non dalle braccia.")
ex("leg-curl-in-piedi", "Leg curl in piedi", ["Standing leg curl"], FEM,
   ["Femorali"], ["Gastrocnemio"], "macchina",
   "In piedi alla macchina con il rullo dietro la caviglia. Piega una gamba alla volta portando il tallone verso il gluteo e scendi lentamente.")

# ------------------------------------------------------------------ GLUTEI
ex("hip-thrust", "Hip thrust", ["Hip thrust con bilanciere", "Spinta d'anca"], GLU,
   ["Grande gluteo"], ["Femorali", "Quadricipite"], "bilanciere",
   "Schiena appoggiata al bordo della panca e bilanciere imbottito sui fianchi. Spingi il bacino in alto fino ad allineare busto e cosce, stringi i glutei e scendi.")
ex("ponte-glutei", "Ponte per glutei", ["Glute bridge", "Ponte glutei"], GLU,
   ["Grande gluteo"], ["Femorali"], "corpo libero",
   "Sdraiato a terra con le ginocchia piegate e i piedi vicini ai glutei. Solleva il bacino stringendo i glutei, tieni un secondo e scendi.")
ex("hip-thrust-macchina", "Hip thrust alla macchina", ["Glute drive"], GLU,
   ["Grande gluteo"], ["Femorali"], "macchina",
   "Posiziona la cintura sui fianchi e i piedi sulla pedana. Spingi il bacino in alto fino all'estensione completa e scendi controllando.")
ex("slanci-cavo", "Slanci posteriori al cavo", ["Cable kickback", "Kickback glutei al cavo", "Slanci glutei"], GLU,
   ["Grande gluteo"], ["Femorali"], "cavi",
   "Aggancia la cavigliera al cavo basso e reggiti alla macchina. Porta la gamba indietro con il ginocchio quasi teso senza inarcare la schiena e torna lentamente.")
ex("abduzioni-macchina", "Abductor machine", ["Abduzioni", "Abduttori alla macchina"], GLU,
   ["Medio gluteo"], ["Piccolo gluteo", "Tensore della fascia lata"], "macchina",
   "Siediti con l'esterno delle ginocchia contro i cuscinetti. Apri le gambe spingendo verso l'esterno e richiudile lentamente.")
ex("adduzioni-macchina", "Adductor machine", ["Adduzioni", "Adduttori alla macchina"], GLU,
   ["Adduttori"], ["Grande gluteo"], "macchina",
   "Siediti con l'interno delle ginocchia contro i cuscinetti aperti. Chiudi le gambe stringendo l'interno coscia e riaprile controllando.")
ex("clamshell", "Clamshell con elastico", ["Conchiglia", "Clam"], GLU,
   ["Medio gluteo"], ["Piccolo gluteo"], "elastici",
   "Sdraiato su un fianco con le ginocchia piegate e un elastico sopra di esse. Tieni i piedi uniti e apri il ginocchio superiore senza ruotare il bacino.")
ex("passi-laterali-elastico", "Passi laterali con elastico", ["Monster walk", "Band walk", "Lateral band walk"], GLU,
   ["Medio gluteo"], ["Piccolo gluteo", "Quadricipite"], "elastici",
   "Elastico attorno alle caviglie o sopra le ginocchia, in mezzo squat. Fai piccoli passi laterali mantenendo l'elastico sempre in tensione.")
ex("frog-pump", "Frog pump", ["Ponte a rana"], GLU,
   ["Grande gluteo"], [], "corpo libero",
   "Sdraiato con le piante dei piedi unite e le ginocchia aperte. Solleva il bacino stringendo forte i glutei e scendi, a ritmo sostenuto.")
ex("hip-thrust-una-gamba", "Hip thrust a una gamba", ["Single leg hip thrust"], GLU,
   ["Grande gluteo"], ["Medio gluteo", "Femorali"], "corpo libero",
   "Schiena sulla panca e un solo piede a terra, l'altra gamba sollevata. Spingi il bacino in alto senza farlo ruotare e scendi controllando.")
ex("donkey-kick", "Slanci a quattro zampe", ["Donkey kick", "Calci del mulo"], GLU,
   ["Grande gluteo"], ["Femorali"], "corpo libero",
   "A quattro zampe con la schiena piatta. Spingi un tallone verso il soffitto con il ginocchio piegato a 90 gradi e torna giù senza inarcare.")
ex("abduzioni-cavo", "Abduzioni al cavo", ["Cable hip abduction"], GLU,
   ["Medio gluteo"], ["Piccolo gluteo"], "cavi",
   "Cavigliera al cavo basso sulla gamba lontana dalla macchina. Porta la gamba di lato senza inclinare il busto e torna lentamente.")
ex("ponte-glutei-isometrico", "Ponte per glutei isometrico", ["Glute bridge hold", "Tenuta del ponte"], GLU,
   ["Grande gluteo"], ["Femorali", "Core"], "corpo libero",
   "Sali in posizione di ponte con i glutei contratti e il corpo allineato dalle spalle alle ginocchia. Resta fermo per il tempo previsto senza far scendere il bacino.", True)

# ------------------------------------------------------------------ POLPACCI
ex("calf-in-piedi-macchina", "Calf raise in piedi", ["Calf raise", "Standing calf raise", "Polpacci in piedi"], POL,
   ["Gastrocnemio"], ["Soleo"], "macchina",
   "Spalle sotto i cuscinetti e avampiedi sul bordo della pedana. Sali sulle punte il più possibile, tieni un attimo e scendi fino a sentire l'allungamento.")
ex("calf-seduto", "Calf raise seduto", ["Seated calf raise", "Polpacci seduto"], POL,
   ["Soleo"], ["Gastrocnemio"], "macchina",
   "Seduto con il cuscino sopra le ginocchia e gli avampiedi sulla pedana. Sali sulle punte e scendi lentamente in tutta l'ampiezza.")
ex("calf-alla-pressa", "Calf alla pressa", ["Leg press calf raise", "Polpacci alla pressa"], POL,
   ["Gastrocnemio"], ["Soleo"], "macchina",
   "Sulla pressa appoggia solo gli avampiedi al bordo della pedana con le gambe quasi tese. Spingi con le punte e torna indietro allungando i polpacci.")
ex("calf-manubrio-una-gamba", "Calf raise a una gamba con manubrio", ["Single leg calf raise"], POL,
   ["Gastrocnemio"], ["Soleo"], "manubri",
   "Avampiede su un gradino e manubrio nella mano dalla stessa parte. Sali sulla punta e scendi sotto il livello del gradino, reggendoti con l'altra mano.")
ex("calf-corpo-libero", "Calf raise a corpo libero", ["Polpacci sul gradino", "Bodyweight calf raise"], POL,
   ["Gastrocnemio"], ["Soleo"], "corpo libero",
   "In piedi su un gradino con i talloni nel vuoto. Sali sulle punte lentamente e scendi fino all'allungamento completo.")
ex("calf-multipower", "Calf raise al multipower", ["Smith machine calf raise"], POL,
   ["Gastrocnemio"], ["Soleo"], "macchina",
   "Bilanciere guidato sulle spalle e avampiedi su un rialzo. Sali sulle punte, tieni un attimo e scendi controllando.")
ex("saltelli-sulle-punte", "Saltelli sulle punte", ["Pogo jump", "Saltelli"], POL,
   ["Gastrocnemio"], ["Soleo"], "corpo libero",
   "Saltella sul posto atterrando sugli avampiedi con le ginocchia quasi tese. Mantieni un ritmo rapido e il contatto con il suolo breve.")

# ------------------------------------------------------------------ CORE
ex("plank", "Plank", ["Plank frontale", "Plank sugli avambracci", "Tenuta in plank"], CORE,
   ["Retto addominale", "Trasverso dell'addome"], ["Obliqui", "Grande gluteo", "Deltoide anteriore"], "corpo libero",
   "Appoggiati su avambracci e punte dei piedi con il corpo in linea retta. Contrai addome e glutei e resta fermo senza far cadere né alzare il bacino.", True)
ex("plank-laterale", "Plank laterale", ["Side plank", "Plank di lato"], CORE,
   ["Obliqui"], ["Medio gluteo", "Trasverso dell'addome"], "corpo libero",
   "Appoggiati su un avambraccio e sul lato del piede con il corpo allineato. Tieni il bacino alto e resta fermo, poi cambia lato.", True)
ex("crunch", "Crunch a terra", ["Crunch", "Addominali crunch"], CORE,
   ["Retto addominale"], ["Obliqui"], "corpo libero",
   "Sdraiato con le ginocchia piegate e le mani vicino alle tempie. Solleva le spalle da terra arrotolando il busto senza tirare il collo e scendi lentamente.")
ex("crunch-inverso", "Crunch inverso", ["Reverse crunch"], CORE,
   ["Retto addominale (parte bassa)"], ["Obliqui"], "corpo libero",
   "Sdraiato con le gambe piegate in aria. Porta le ginocchia verso il petto sollevando il bacino da terra e torna giù senza slancio.")
ex("crunch-cavo", "Crunch al cavo", ["Cable crunch", "Crunch in ginocchio al cavo"], CORE,
   ["Retto addominale"], ["Obliqui"], "cavi",
   "In ginocchio davanti al cavo alto con la corda ai lati della testa. Arrotola il busto portando i gomiti verso le cosce e risali controllando.")
ex("crunch-macchina", "Crunch alla macchina", ["Ab crunch machine", "Abdominal machine"], CORE,
   ["Retto addominale"], ["Obliqui"], "macchina",
   "Siediti e afferra le maniglie o appoggia il petto ai cuscinetti. Fletti il busto in avanti contraendo l'addome e torna lentamente.")
ex("sollevamento-gambe-sbarra", "Sollevamento gambe alla sbarra", ["Hanging leg raise", "Leg raise alla sbarra"], CORE,
   ["Retto addominale (parte bassa)", "Flessori dell'anca"], ["Obliqui"], "corpo libero",
   "Appeso alla sbarra a braccia tese. Solleva le gambe fino all'altezza dei fianchi o più senza dondolare e scendi controllando.")
ex("sollevamento-ginocchia-sbarra", "Ginocchia al petto alla sbarra", ["Hanging knee raise"], CORE,
   ["Retto addominale (parte bassa)", "Flessori dell'anca"], ["Obliqui"], "corpo libero",
   "Appeso alla sbarra, porta le ginocchia verso il petto arrotolando il bacino. Scendi lentamente senza oscillare.")
ex("sollevamento-gambe-terra", "Sollevamento gambe a terra", ["Leg raise", "Lying leg raise"], CORE,
   ["Retto addominale (parte bassa)", "Flessori dell'anca"], [], "corpo libero",
   "Sdraiato con le mani sotto i glutei e la zona lombare a terra. Solleva le gambe tese fino a 90 gradi e scendi senza appoggiarle.")
ex("captain-chair", "Sollevamento ginocchia al captain's chair", ["Captain's chair", "Knee raise alle parallele"], CORE,
   ["Retto addominale (parte bassa)", "Flessori dell'anca"], ["Obliqui"], "macchina",
   "Avambracci sui supporti e schiena appoggiata. Porta le ginocchia verso il petto e scendi controllando senza dondolare.")
ex("russian-twist", "Russian twist", ["Torsioni russe", "Rotazioni del busto seduto"], CORE,
   ["Obliqui"], ["Retto addominale"], "corpo libero",
   "Seduto con il busto inclinato indietro e i piedi a terra o sollevati. Ruota il busto da un lato all'altro portando le mani o un peso accanto ai fianchi.")
ex("ab-wheel", "Ruota per addominali", ["Ab wheel", "Rollout", "Ab roller"], CORE,
   ["Retto addominale"], ["Gran dorsale", "Trasverso dell'addome"], "altro",
   "In ginocchio con le mani sulla ruota. Spingi la ruota in avanti allungando il corpo senza inarcare la schiena e torna indietro contraendo l'addome.")
ex("dead-bug", "Dead bug", ["Scarafaggio"], CORE,
   ["Trasverso dell'addome"], ["Retto addominale"], "corpo libero",
   "Sdraiato con braccia verso il soffitto e ginocchia a 90 gradi. Allunga un braccio e la gamba opposta verso terra tenendo la schiena appiccicata al pavimento e alterna.")
ex("bird-dog", "Bird dog", ["Quadrupedia braccio e gamba opposti"], CORE,
   ["Erettori spinali", "Trasverso dell'addome"], ["Grande gluteo"], "corpo libero",
   "A quattro zampe, allunga un braccio in avanti e la gamba opposta indietro. Tieni il bacino fermo, fai una pausa e alterna i lati.")
ex("hollow-hold", "Hollow hold", ["Tenuta a barchetta", "Hollow body"], CORE,
   ["Retto addominale"], ["Trasverso dell'addome", "Flessori dell'anca"], "corpo libero",
   "Sdraiato, solleva spalle e gambe tese da terra premendo la zona lombare sul pavimento. Mantieni la posizione a barchetta per il tempo previsto.", True)
ex("pallof-press", "Pallof press", ["Antirotazione al cavo"], CORE,
   ["Obliqui", "Trasverso dell'addome"], [], "cavi",
   "Di fianco al cavo con la maniglia al petto. Spingi le mani in avanti resistendo alla rotazione, tieni un attimo e riporta al petto.")
ex("woodchopper", "Woodchopper al cavo", ["Taglialegna", "Cable woodchop"], CORE,
   ["Obliqui"], ["Retto addominale", "Deltoidi"], "cavi",
   "Di lato al cavo alto, tira la maniglia in diagonale verso il fianco opposto ruotando il busto e le anche. Torna controllando.")
ex("mountain-climber", "Mountain climber", ["Scalatore", "Ginocchia al petto in plank"], CORE,
   ["Retto addominale", "Flessori dell'anca"], ["Deltoidi", "Quadricipite"], "corpo libero",
   "In posizione di piegamento a braccia tese, porta un ginocchio verso il petto e alterna rapidamente le gambe. Tieni il bacino basso e stabile.")
ex("sit-up", "Sit up", ["Addominali completi", "Situp"], CORE,
   ["Retto addominale"], ["Flessori dell'anca", "Obliqui"], "corpo libero",
   "Sdraiato con le ginocchia piegate e i piedi a terra. Sali fino a sederti con il busto dritto e torna giù lentamente vertebra per vertebra.")
ex("crunch-bicicletta", "Crunch a bicicletta", ["Bicycle crunch", "Bicicletta"], CORE,
   ["Obliqui", "Retto addominale"], [], "corpo libero",
   "Sdraiato con le mani dietro la testa, porta un gomito verso il ginocchio opposto mentre l'altra gamba si distende. Alterna in modo controllato.")
ex("flessioni-laterali-manubrio", "Flessioni laterali con manubrio", ["Side bend", "Piegamenti laterali"], CORE,
   ["Obliqui"], ["Quadrato dei lombi"], "manubri",
   "In piedi con un manubrio in una mano. Piegati di lato verso il peso e risali contraendo il fianco opposto, poi cambia lato.")
ex("dead-hang", "Dead hang", ["Sospensione alla sbarra", "Appeso alla sbarra", "Hang"], CORE,
   ["Avambracci", "Gran dorsale"], ["Spalle", "Trasverso dell'addome"], "corpo libero",
   "Afferra la sbarra con le mani alla larghezza delle spalle e lasciati appendere a braccia tese, piedi staccati da terra. Tieni le spalle attive, senza farle salire alle orecchie, e resta appeso per il tempo previsto.", True)
ex("l-sit", "L-sit", ["Squadra alle parallele"], CORE,
   ["Retto addominale", "Flessori dell'anca"], ["Tricipite", "Quadricipite"], "corpo libero",
   "Sulle parallele o a terra con le mani accanto ai fianchi, sollevati e tieni le gambe tese parallele al pavimento. Resta fermo per il tempo previsto.", True)

# ------------------------------------------------------------------ CORPO INTERO / CARDIO
ex("burpee", "Burpee", ["Burpees"], CARD,
   ["Corpo intero"], ["Quadricipite", "Grande pettorale", "Core"], "corpo libero",
   "Da in piedi scendi in squat, porta i piedi indietro in posizione di piegamento ed esegui un piegamento. Riporta i piedi sotto il corpo e salta in alto.")
ex("jumping-jack", "Jumping jack", ["Salti a stella", "Jumping jacks"], CARD,
   ["Corpo intero"], ["Polpacci", "Deltoidi"], "corpo libero",
   "Salta aprendo le gambe e portando le braccia sopra la testa, poi salta di nuovo richiudendole. Mantieni un ritmo costante.")
ex("salto-corda", "Salto della corda", ["Jump rope", "Corda"], CARD,
   ["Polpacci"], ["Quadricipite", "Spalle"], "altro",
   "Gira la corda con i polsi tenendo i gomiti vicino ai fianchi. Salta poco, sugli avampiedi, quanto basta per far passare la corda.")
ex("tapis-roulant", "Corsa sul tapis roulant", ["Tapis roulant", "Treadmill", "Corsa"], CARD,
   ["Corpo intero"], ["Quadricipite", "Polpacci", "Femorali"], "macchina",
   "Inizia camminando e aumenta gradualmente la velocità. Corri con passi corti e busto dritto, senza aggrapparti ai corrimano.")
ex("cyclette", "Cyclette", ["Bici da camera", "Spinning", "Bike"], CARD,
   ["Quadricipite"], ["Grande gluteo", "Polpacci"], "macchina",
   "Regola la sella in modo che la gamba sia quasi tesa nel punto più basso. Pedala con ritmo regolare scegliendo una resistenza che ti permetta di parlare a fatica.")
ex("vogatore", "Vogatore", ["Rowing machine", "Rower", "Remoergometro"], CARD,
   ["Corpo intero"], ["Gran dorsale", "Quadricipite", "Grande gluteo"], "macchina",
   "Spingi prima con le gambe, poi inclina leggermente il busto indietro e tira la maniglia verso lo sterno. Torna nell'ordine inverso: braccia, busto, gambe.")
ex("ellittica", "Ellittica", ["Cross trainer", "Elliptical"], CARD,
   ["Corpo intero"], ["Quadricipite", "Grande gluteo"], "macchina",
   "Spingi e tira le maniglie mentre le gambe compiono il movimento ellittico. Mantieni il busto dritto e una resistenza costante.")
ex("stair-climber", "Stair climber", ["Scale", "Simulatore di scale"], CARD,
   ["Quadricipite", "Grande gluteo"], ["Polpacci"], "macchina",
   "Sali i gradini a ritmo costante appoggiando tutto il piede. Reggiti appena ai corrimano senza scaricarvi il peso.")
ex("thruster", "Thruster", ["Squat con spinta"], CARD,
   ["Quadricipite", "Deltoide anteriore"], ["Grande gluteo", "Tricipite", "Core"], "bilanciere",
   "Esegui un front squat e, risalendo, usa la spinta delle gambe per portare il bilanciere sopra la testa. Riporta il peso alle spalle e scendi nel successivo squat.")
ex("clean", "Girata al petto", ["Power clean", "Clean", "Girata"], CARD,
   ["Corpo intero"], ["Femorali", "Grande gluteo", "Trapezio"], "bilanciere",
   "Dal pavimento solleva il bilanciere come in uno stacco, poi estendi esplosivamente anche e caviglie. Infilati sotto il bilanciere e ricevilo sulle spalle con i gomiti alti.")
ex("snatch-kettlebell", "Strappo con kettlebell", ["Kettlebell snatch"], CARD,
   ["Corpo intero"], ["Grande gluteo", "Femorali", "Deltoidi"], "kettlebell",
   "Come uno swing a una mano, ma alla fine della spinta tira il kettlebell sopra la testa facendolo girare attorno al polso. Riportalo giù tra le gambe e ripeti.")
ex("clean-and-press-kettlebell", "Clean and press con kettlebell", ["Kettlebell clean and press"], CARD,
   ["Corpo intero"], ["Deltoide anteriore", "Grande gluteo", "Core"], "kettlebell",
   "Porta il kettlebell in posizione di rack sulla spalla con uno slancio delle anche. Spingilo sopra la testa, riportalo alla spalla e poi giù tra le gambe.")
ex("turkish-get-up", "Turkish get up", ["Alzata turca"], CARD,
   ["Corpo intero"], ["Spalle", "Core", "Grande gluteo"], "kettlebell",
   "Da sdraiato con il kettlebell sopra la spalla a braccio teso, alzati in piedi passo dopo passo tenendo lo sguardo sul peso. Torna a terra seguendo i passaggi al contrario.")
ex("farmer-walk", "Farmer walk", ["Camminata del contadino", "Farmer carry"], CARD,
   ["Avambracci", "Trapezio"], ["Core", "Grande gluteo"], "manubri",
   "Prendi due manubri pesanti ai fianchi e cammina a passi corti mantenendo il busto dritto e le spalle basse. Percorri la distanza o il tempo previsti.", True)
ex("box-jump", "Box jump", ["Salto sul box", "Salti sul gradone"], CARD,
   ["Quadricipite", "Grande gluteo"], ["Polpacci", "Femorali"], "altro",
   "Davanti a un box stabile, piega le ginocchia e salta atterrando morbido con tutto il piede sopra. Scendi camminando, non saltando all'indietro.")
ex("wall-ball", "Wall ball", ["Lancio della palla al muro"], CARD,
   ["Quadricipite", "Deltoide anteriore"], ["Grande gluteo", "Core"], "altro",
   "Tieni la palla medica al petto e scendi in squat. Risalendo lanciala contro il muro verso un bersaglio in alto, riprendila e passa alla ripetizione successiva.")
ex("battle-rope", "Battle rope", ["Corde da battaglia", "Corde ondulatorie"], CARD,
   ["Spalle"], ["Core", "Avambracci", "Quadricipite"], "altro",
   "In mezzo squat con una corda per mano, alterna le braccia in su e in giù per creare onde continue. Mantieni il busto stabile per il tempo previsto.", True)
ex("sled-push", "Spinta della slitta", ["Sled push", "Slitta"], CARD,
   ["Quadricipite", "Grande gluteo"], ["Polpacci", "Spalle"], "altro",
   "Mani sulle maniglie e busto inclinato in avanti. Spingi la slitta con passi corti e potenti mantenendo la schiena dritta.")
ex("bear-crawl", "Bear crawl", ["Camminata dell'orso"], CARD,
   ["Corpo intero"], ["Spalle", "Core", "Quadricipite"], "corpo libero",
   "A quattro zampe con le ginocchia sollevate di pochi centimetri. Avanza muovendo insieme mano e piede opposti, tenendo la schiena piatta.")
ex("skip-alto", "Skip alto", ["High knees", "Corsa sul posto a ginocchia alte"], CARD,
   ["Flessori dell'anca", "Quadricipite"], ["Polpacci", "Core"], "corpo libero",
   "Corri sul posto portando le ginocchia all'altezza dei fianchi. Atterra sugli avampiedi e accompagna il movimento con le braccia.")


# ------------------------------------------------------------------ verifica e scrittura
def fold(s):
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]", "", s.lower())


def check():
    errors = []
    ids, keys = set(), {}
    for e in E:
        if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", e["id"]):
            errors.append(f"id non valido: {e['id']}")
        if e["id"] in ids:
            errors.append(f"id duplicato: {e['id']}")
        ids.add(e["id"])
        if e["bodyPart"] not in BODY_PARTS:
            errors.append(f"{e['id']}: parte del corpo sconosciuta {e['bodyPart']}")
        if e["equipment"] not in EQUIPMENT:
            errors.append(f"{e['id']}: attrezzo sconosciuto {e['equipment']}")
        sentences = [x for x in re.split(r"(?<=[.!?])\s+", e["instructions"].strip()) if x]
        if not 2 <= len(sentences) <= 3:
            errors.append(f"{e['id']}: istruzioni con {len(sentences)} frasi")
        for label in [e["name"], *e["aliases"]]:
            k = fold(label)
            if k in keys and keys[k] != e["id"]:
                errors.append(f"nome/alias '{label}' di {e['id']} uguale a uno di {keys[k]}")
            keys[k] = e["id"]
    return errors


if __name__ == "__main__":
    errs = check()
    if errs:
        print("\n".join(errs)); sys.exit(1)
    data = {
        "libraryVersion": LIBRARY_VERSION,
        "license": "Testi scritti per Diario Palestra; liberi da usare e modificare in questo progetto.",
        "bodyParts": BODY_PARTS,
        "equipment": EQUIPMENT,
        "exercises": E,
    }
    OUT.parent.mkdir(exist_ok=True)
    # Un esercizio per riga: file leggibile e diff piccoli.
    lines = [json.dumps(e, ensure_ascii=False) for e in E]
    head = json.dumps({k: v for k, v in data.items() if k != "exercises"}, ensure_ascii=False, indent=2)[:-2]
    OUT.write_text(head + ',\n  "exercises": [\n    ' + ',\n    '.join(lines) + '\n  ]\n}\n', encoding="utf-8")
    json.loads(OUT.read_text(encoding="utf-8"))  # controllo che sia JSON valido
    counts = {p: sum(1 for e in E if e["bodyPart"] == p) for p in BODY_PARTS}
    print(f"{len(E)} esercizi scritti in {OUT}")
    for p, n in counts.items():
        print(f"  {p}: {n}")
    print(f"  (a tempo: {sum(1 for e in E if e['timed'])})")
