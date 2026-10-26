# Calendario campionato di calciobalilla

Sito statico (HTML + CSS + JavaScript, nessuna installazione) con quattro sezioni:

1. **La mia squadra** – calendario della squadra, data delle partite da giocare, risultati e formazioni di quelle giocate
2. **Giocatori** – statistiche individuali (giornate di presenza, partite disputate, vinte/perse, % vittorie)
3. **Calendario** – tutte le giornate, profilo di ogni squadra con referenti e sede apribile in Google Maps
4. **Classifica** – classifica generale

Chiunque abbia il link può consultare il sito; i risultati si inseriscono dopo aver sbloccato il lucchetto con la password.

## File

| File | A cosa serve |
|---|---|
| `index.html` | Pagina principale |
| `style.css` | Grafica |
| `app.js` | Logica dell'app (non serve modificarlo) |
| `data.js` | **Squadre, giocatori, calendario e impostazioni: è il file da modificare** |
| `firestore.rules` | Regole di sicurezza da copiare in Firebase |

## 1. Configurare Firebase (una volta sola)

Nella [console Firebase](https://console.firebase.google.com) del progetto `calendario-2627`:

1. **Firestore Database** → *Crea database* (server in Europa).
2. Firestore → scheda **Regole** → incolla il contenuto di `firestore.rules` → *Pubblica*.
   Le regole della "modalità di prova" scadono dopo 30 giorni: queste invece non scadono.

Non serve configurare Authentication: la password di inserimento è controllata dal sito
(si trova in `data.js`, voce `password`).

## 2. Pubblicare su GitHub Pages

1. Crea un nuovo repository su GitHub (es. `calendario`), pubblico.
2. *Add file* → *Upload files* → trascina tutti i file di questa cartella → *Commit*.
3. *Settings* → *Pages* → *Source: Deploy from a branch* → branch `main`, cartella `/ (root)` → *Save*.
4. Dopo un paio di minuti il sito è su `https://TUONOME.github.io/calendario/`.

> Aprendo `index.html` con un doppio clic dal computer la pagina resta vuota (i browser bloccano i moduli JavaScript in locale): va provato online o con un piccolo server locale.

## 3. Inserire i dati veri (`data.js`)

- **CONFIG.formato**: 3 turni × 3 set × 2 partite = 18 partite; ogni partita vinta vale 1 punto.
- **CONFIG.password**: la password per inserire i risultati.
- **CONFIG.demo**: `true` mostra risultati inventati; metti `false` quando parte il campionato.
- **SQUADRE**: nome, sigla e colore del cerchio, referenti con telefono, sede con indirizzo
  (oppure `maps: "link di Google Maps"` per una posizione precisa), `logo` facoltativo.
- **GIOCATORI**: elenco iniziale della squadra. Dopo il primo salvataggio dal sito (sezione Giocatori, in modalità inserimento) vale quello salvato su Firebase.
- **CALENDARIO**: giornate con data, ora e accoppiamenti (la prima squadra gioca in casa).

Su GitHub puoi modificare `data.js` direttamente dal browser (icona della matita) e salvare con *Commit changes*.

## 4. Inserire i risultati

1. Tocca il **lucchetto** in alto a destra e digita la password.
2. Sulle partite compare il pulsante **Risultato**.
   - Partite della tua squadra: per ogni set scegli la coppia, scrivi i nomi degli avversari
     (il sito suggerisce quelli già usati contro la stessa squadra) e l'esito delle 2 partite (V/P);
     punti dell'incontro e statistiche dei giocatori si calcolano da soli.
   - Altre partite: inserisci i punti di una squadra, l'altra si completa a 18.
   - In entrambi i casi puoi cambiare data e ora (utile per i rinvii).
3. Nella sezione **Giocatori** compare «Aggiungi o modifica giocatori»: puoi rinominare, aggiungere
   ed eliminare giocatori. Chi ha già giocato non si elimina ma si «toglie»: sparisce dai menu
   e resta nelle statistiche con l'etichetta *ex*.
4. I dati si aggiornano in tempo reale per tutti.

## Come vengono calcolate le statistiche

- **Classifica**: somma dei punti (partite vinte) di tutte le giornate; a parità, chi ha giocato meno giornate.
- **Giocatori**: *giornate di presenza* = incontri in cui il giocatore ha giocato almeno una partita;
  *partite disputate* = partite giocate in totale (2 per ogni set giocato). Ordinamento per partite disputate, a parità alfabetico.
