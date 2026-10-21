# Deep Gut 0.2 — note di consegna

## Implementato

- Identità visiva verde acido, petrolio e corallo; protagonista con visore, pose animate, quattro ambienti e ostacoli vettoriali.
- Nuove schermate: menu, preparazione, laboratorio, record locali, impostazioni, pausa e rapporto finale.
- Spedizione finita di 3.200 metri e modalità infinita, con ripartenza immediata che conserva ricetta e modalità.
- Gas Burst tattico da caricare con fagioli e schivate ravvicinate, con stato ed energia visibili.
- Progressione della velocità meno brusca, sequenze di ostacoli con una corsia libera, indicatori di regione e durata dei bonus.
- Pausa che congela fisica, timer, animazione del protagonista, tween e durata dei bonus; pausa automatica quando la pagina viene nascosta.
- Correzione dei comandi duplicati ai riavvii e dell'interferenza fra pulsanti touch e gesti.
- Ricompense cumulative assegnate una sola volta, schivate non ripetibili sullo stesso ostacolo, tetto ai potenziamenti e copie indipendenti dei valori di salvataggio predefiniti.
- Salvataggi separati; nessuna modifica al sito online.
- Build senza l'editor interno degli asset e senza dipendenze runtime da font esterni.

## Prima della vendita

Questa è una versione giocabile migliorata e verificabile, non una certificazione commerciale. Restano da completare un playtest esterno per bilanciamento e durata, prove su Safari/iPhone e Android fisici, e la scelta del canale di distribuzione con accesso a pagamento. Non sono implementati checkout, licenze di accesso, account, cloud save o protezione dei record.

Il rendering dei test è Chrome desktop con emulazione touch: non equivale a test su dispositivi reali. L'audio eredita il carattere procedurale della prima versione. Le pose del protagonista sono variazioni vettoriali della stessa figura; un'animazione disegnata fotogramma per fotogramma e un sound design dedicato sono possibili passi successivi.

## Pubblicazione

`npm run build` produce `dist/`. Pubblicare questa directory su un progetto di hosting **nuovo**, senza collegarlo al deployment dell'originale. Non è stato eseguito alcun deploy. Conservare questa cartella e una copia di backup prima di iniziare altri interventi.
