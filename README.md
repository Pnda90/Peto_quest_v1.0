# Peto Quest: Deep Gut — Edizione 02

Versione indipendente del gioco, realizzata il 22 ottobre 2026. Il progetto originale `peto-quest-main` e il sito online non sono necessari per avviare questa copia.

## Avvio

Con Node.js 22 o successivo:

```sh
npm install
npm run dev
```

Apri l'indirizzo indicato dal terminale. Per generare il gioco distribuibile:

```sh
npm run build
npm run preview
```

La cartella `dist/` è il pacchetto statico da distribuire. Non aprire `index.html` direttamente con doppio clic: il gioco richiede un server HTTP. `Avvia gioco.command` avvia l'anteprima su macOS.

## Il gioco

- **Spedizione**: attraversa quattro regioni e raggiungi 3.200 metri; il traguardo assegna 2.500 punti extra.
- **Corsa infinita**: tenta il record senza un traguardo. Cambia modalità nella schermata di preparazione.
- **Gas Burst**: ogni fagiolo carica l'energia di 8 punti; una schivata perfetta ne aggiunge 20. A 100, premi E o il pulsante per distruggere gli ostacoli per tre secondi. Durante il Burst non accumuli altra energia.
- **Ricette**: fagioli (+15% velocità iniziale), cipolla (raggio maggiore durante il magnete), peperoncino (valore doppio dei fagioli e punti raccolti).
- **Laboratorio**: tre look e due potenziamenti permanenti fino al livello 5, acquistabili con valuta guadagnata giocando.
- **Sequenze di ostacoli**: introduzione graduale e almeno una corsia libera in ogni fila.

Frecce/WASD per muoversi, Spazio per saltare, giù/S per scivolare, E per Burst, Esc per pausa. Su touch sono disponibili swipe e pulsanti. I tubi richiedono una scivolata; cristalli e pozze si superano saltando.

## Salvataggi e isolamento

Chiave locale: `peto_quest_deep_gut_v2`. La chiave originale `fart_quest_save_v1` non viene modificata. I record sono locali al browser, non una classifica online. Nessun servizio di pagamento, account o telemetria è collegato.

## Verifiche

```sh
npm test
npm run lint
npm run build
# Con il server di sviluppo in esecuzione sulla porta 5188:
node tools/qa/browser-smoke.mjs
```

Il test browser usa Chrome locale su macOS; per altri sistemi impostare `CHROME_PATH`. `QA_URL` permette di cambiare l'URL. Le schermate vengono salvate in `qa/`. L'accesso di test al gioco è disponibile solo in sviluppo e viene eliminato nella build di produzione.

## Asset

I nuovi asset SVG modificabili si trovano in `public/art/`: protagonista con sette pose, quattro ambienti, tre ostacoli e tre icone alimentari. Non dipendono da font o CDN esterni. La particella di fumo e l'audio procedurale derivano dalla base originale. Vedi `ASSETS.md` e `RELEASE-NOTES.md`.

Per il rilascio commerciale e le verifiche ancora necessarie, vedi `RELEASE-NOTES.md`.
