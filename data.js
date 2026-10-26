// =====================================================================
//  DATI DEL CAMPIONATO
//  Questo è l'unico file da modificare per squadre, giocatori e calendario.
//  I risultati invece si inseriscono dal sito (lucchetto in alto a destra).
// =====================================================================

export const CONFIG = {
  titolo: "Calciobalilla",
  sottotitolo: "Campionato 2026/27",

  // id della tua squadra (deve corrispondere a uno degli id in SQUADRE)
  miaSquadra: "BAR",

  // Struttura di un incontro: 3 turni x 3 set x 2 partite = 18 partite.
  // Ogni partita vinta vale 1 punto (totale 18 punti in palio per incontro).
  // Ogni set è giocato da una coppia (giocatoriPerSet) che disputa le sue 2 partite.
  formato: { turni: 3, setPerTurno: 3, partitePerSet: 2, giocatoriPerSet: 2 },

  // true = mostra risultati inventati per le giornate già passate,
  // utile per vedere lo scheletro. Metti false quando inizi a inserire i dati veri.
  demo: true,

  // Password per inserire i risultati dal sito (lucchetto in alto a destra)
  password: "b6a7",
};

export const firebaseConfig = {
  apiKey: "AIzaSyD-CURdHPdO5dXCgmlPGtCnI8Z318eDKdA",
  authDomain: "calendario-2627.firebaseapp.com",
  projectId: "calendario-2627",
  storageBucket: "calendario-2627.firebasestorage.app",
  messagingSenderId: "499196500519",
  appId: "1:499196500519:web:13f4f3f01f6cc7c9538c02",
};

// ---------------------------------------------------------------------
//  SQUADRE  (nomi, referenti e sedi sono segnaposto da sostituire)
//  logo: facoltativo, percorso di un'immagine nel repository (es. "loghi/bar.png")
//  sede.maps: facoltativo, link Google Maps preciso; altrimenti si usa l'indirizzo
// ---------------------------------------------------------------------
export const SQUADRE = [
  { id: "BAR", nome: "Bar Angeli", sigla: "BA", colore: "#c8102e",
    referenti: [{ nome: "Referente 1", telefono: "+39 333 000 0001" }],
    sede: { nome: "Bar Angeli", indirizzo: "Via Esempio 1, Città" } },
  { id: "SPO", nome: "Bar Sport", sigla: "BS", colore: "#1f6fd1",
    referenti: [{ nome: "Referente 2", telefono: "+39 333 000 0002" }],
    sede: { nome: "Bar Sport", indirizzo: "Via Esempio 2, Città" } },
  { id: "AUR", nome: "Circolo Aurora", sigla: "CA", colore: "#e08a00",
    referenti: [{ nome: "Referente 3", telefono: "+39 333 000 0003" }],
    sede: { nome: "Circolo Aurora", indirizzo: "Via Esempio 3, Città" } },
  { id: "VER", nome: "Tavolo Verde", sigla: "TV", colore: "#1f9d63",
    referenti: [{ nome: "Referente 4", telefono: "+39 333 000 0004" }],
    sede: { nome: "Tavolo Verde", indirizzo: "Via Esempio 4, Città" } },
  { id: "STA", nome: "Old Station", sigla: "OS", colore: "#5b4b8a",
    referenti: [{ nome: "Referente 5", telefono: "+39 333 000 0005" }],
    sede: { nome: "Old Station Pub", indirizzo: "Via Esempio 5, Città" } },
  { id: "RIB", nome: "Pub Ribelle", sigla: "PR", colore: "#222831",
    referenti: [{ nome: "Referente 6", telefono: "+39 333 000 0006" }],
    sede: { nome: "Pub Ribelle", indirizzo: "Via Esempio 6, Città" } },
  { id: "NOR", nome: "Bocciofila Nord", sigla: "BN", colore: "#0f8b9c",
    referenti: [{ nome: "Referente 7", telefono: "+39 333 000 0007" }],
    sede: { nome: "Bocciofila Nord", indirizzo: "Via Esempio 7, Città" } },
  { id: "CEN", nome: "Caffè Centrale", sigla: "CC", colore: "#8a5a2b",
    referenti: [{ nome: "Referente 8", telefono: "+39 333 000 0008" }],
    sede: { nome: "Caffè Centrale", indirizzo: "Via Esempio 8, Città" } },
];

// ---------------------------------------------------------------------
//  GIOCATORI della tua squadra: elenco iniziale.
//  Dopo il primo salvataggio dal sito (Giocatori → «Aggiungi o modifica giocatori»)
//  vale l'elenco salvato su Firebase e questo viene ignorato.
// ---------------------------------------------------------------------
export const GIOCATORI = [
  { id: "g01", nome: "Alessandro" },
  { id: "g02", nome: "Andrea" },
  { id: "g03", nome: "Davide" },
  { id: "g04", nome: "Federico" },
  { id: "g05", nome: "Francesco" },
  { id: "g06", nome: "Giulia" },
  { id: "g07", nome: "Luca" },
  { id: "g08", nome: "Marco" },
  { id: "g09", nome: "Matteo" },
  { id: "g10", nome: "Paolo" },
  { id: "g11", nome: "Simone" },
  { id: "g12", nome: "Stefano" },
];

// ---------------------------------------------------------------------
//  CALENDARIO (andata + ritorno, date segnaposto)
//  Ogni partita può avere una sua data/ora diversa da quella della giornata:
//  { casa: "BAR", ospite: "SPO", data: "2026-10-08", ora: "20:30" }
//  Data e ora si possono anche modificare dal sito in modalità inserimento.
// ---------------------------------------------------------------------
export const CALENDARIO = [
  { giornata: 1, data: "2026-10-06", ora: "21:00", partite: [
    { casa: "BAR", ospite: "SPO" },
    { casa: "AUR", ospite: "CEN" },
    { casa: "VER", ospite: "NOR" },
    { casa: "STA", ospite: "RIB" }
  ]},
  { giornata: 2, data: "2026-10-13", ora: "21:00", partite: [
    { casa: "CEN", ospite: "BAR" },
    { casa: "NOR", ospite: "SPO" },
    { casa: "RIB", ospite: "AUR" },
    { casa: "STA", ospite: "VER" }
  ]},
  { giornata: 3, data: "2026-10-20", ora: "21:00", partite: [
    { casa: "BAR", ospite: "NOR" },
    { casa: "CEN", ospite: "RIB" },
    { casa: "SPO", ospite: "STA" },
    { casa: "AUR", ospite: "VER" }
  ]},
  { giornata: 4, data: "2026-10-27", ora: "21:00", partite: [
    { casa: "RIB", ospite: "BAR" },
    { casa: "STA", ospite: "NOR" },
    { casa: "VER", ospite: "CEN" },
    { casa: "AUR", ospite: "SPO" }
  ]},
  { giornata: 5, data: "2026-11-03", ora: "21:00", partite: [
    { casa: "BAR", ospite: "STA" },
    { casa: "RIB", ospite: "VER" },
    { casa: "NOR", ospite: "AUR" },
    { casa: "CEN", ospite: "SPO" }
  ]},
  { giornata: 6, data: "2026-11-10", ora: "21:00", partite: [
    { casa: "VER", ospite: "BAR" },
    { casa: "AUR", ospite: "STA" },
    { casa: "SPO", ospite: "RIB" },
    { casa: "CEN", ospite: "NOR" }
  ]},
  { giornata: 7, data: "2026-11-17", ora: "21:00", partite: [
    { casa: "BAR", ospite: "AUR" },
    { casa: "VER", ospite: "SPO" },
    { casa: "STA", ospite: "CEN" },
    { casa: "RIB", ospite: "NOR" }
  ]},
  { giornata: 8, data: "2026-11-24", ora: "21:00", partite: [
    { casa: "SPO", ospite: "BAR" },
    { casa: "CEN", ospite: "AUR" },
    { casa: "NOR", ospite: "VER" },
    { casa: "RIB", ospite: "STA" }
  ]},
  { giornata: 9, data: "2026-12-01", ora: "21:00", partite: [
    { casa: "BAR", ospite: "CEN" },
    { casa: "SPO", ospite: "NOR" },
    { casa: "AUR", ospite: "RIB" },
    { casa: "VER", ospite: "STA" }
  ]},
  { giornata: 10, data: "2026-12-08", ora: "21:00", partite: [
    { casa: "NOR", ospite: "BAR" },
    { casa: "RIB", ospite: "CEN" },
    { casa: "STA", ospite: "SPO" },
    { casa: "VER", ospite: "AUR" }
  ]},
  { giornata: 11, data: "2026-12-15", ora: "21:00", partite: [
    { casa: "BAR", ospite: "RIB" },
    { casa: "NOR", ospite: "STA" },
    { casa: "CEN", ospite: "VER" },
    { casa: "SPO", ospite: "AUR" }
  ]},
  { giornata: 12, data: "2026-12-22", ora: "21:00", partite: [
    { casa: "STA", ospite: "BAR" },
    { casa: "VER", ospite: "RIB" },
    { casa: "AUR", ospite: "NOR" },
    { casa: "SPO", ospite: "CEN" }
  ]},
  { giornata: 13, data: "2026-12-29", ora: "21:00", partite: [
    { casa: "BAR", ospite: "VER" },
    { casa: "STA", ospite: "AUR" },
    { casa: "RIB", ospite: "SPO" },
    { casa: "NOR", ospite: "CEN" }
  ]},
  { giornata: 14, data: "2027-01-05", ora: "21:00", partite: [
    { casa: "AUR", ospite: "BAR" },
    { casa: "SPO", ospite: "VER" },
    { casa: "CEN", ospite: "STA" },
    { casa: "NOR", ospite: "RIB" }
  ]},
];
