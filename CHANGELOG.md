# Changelog

## v0.3.0 — Bug Fix Blocco Schermata & Overhaul Gameplay Completo 🚀 (6 Ottobre 2026)

Intervento completo da intero team di sviluppo (Engine Lead, Gameplay Designer, UI/UX Designer, Audio Engineer, QA):

### 🛑 Risoluzione Critica: Blocco Schermata dopo Pochi Secondi
- **Risolto crash `setVelocityY` su oggetti distrutti**: In `cleanupGroup`, gli elementi distrutti o usciti dallo schermo subivano un accesso a `body.velocity` causando un `TypeError: Cannot read properties of null` che interrompeva bruscamente il loop di rendering Phaser (schermata bloccata).
- **Risolto leak degli emettitori di particelle**: Eliminata la creazione di infiniti `ParticleEmitter` permanenti a ogni fagiolo o potenziamento raccolto; introdotto pooling ad alte prestazioni con `.explode(...)` a costo memoria zero (60 FPS stabili).
- **Risolto bug input touch/mobile (swipe rotto)**: In `InputSystem`, `pointer.time` era indefinito in Phaser 3 producendo `deltaTime = NaN`, impedendo completamente a chiunque di cambiare corsia o schivare tramite tocco/swipe.
- **Risolto freeze Web Audio in `AudioSystem`**: Parametri audio con timestamp passati o rampe da 0 causavano eccezioni DOMException nei browser WebKit/Chromium; introdotta risincronizzazione orologio, protezioni try/catch e tempo clamped.

### 🎮 Gameplay & Meccaniche Potenziate
- **Controlli Virtuali a Schermo (Mobile Touch HUD)**: Aggiunti 4 pulsanti touch dedicati e reattivi in basso a sinistra e a destra (◀ Corsia SX, ▶ Corsia DX, 🦘 Salta, 💨 Scivola), perfetti sia su smartphone che su tablet e desktop.
- **Supporto tasto Spazio per saltare**: Aggiunto supporto a Barra Spaziatrice e tap direzionale veloce.
- **Regole Ostacoli Chiare & Telegrafate**:
  - `obs_spike` (Spuntoni da terra): si superano saltando (`SALTA` 🦘).
  - `obs_trap` (Pozza acida): si superano saltando (`SALTA` 🦘).
  - `obs_barrier` (Tubo a vapore a mezz'aria): si superano scivolando (`SCIVOLA` 💨).
- **Nuovo Ostacolo Procedurale `obs_barrier`**: Tubo a vapore ad alta pressione con strisce di pericolo gialle/nere e valvola incandescente.
- **Meccanica "Schivata Perfetta" (Close Call)**: Schivare un ostacolo all'ultimo istante assegna +100 punti bonus con animazione testuale e suono dedicato.
- **Grace Period Iniziale**: Ritardato il primo spawn degli ostacoli a 2.2s per consentire al giocatore di prendere il ritmo.
- **Transizioni di Livello Più Frequenti**: Passaggio di bioma digestivo ogni 800m con banner visivo e fanfare.

### 🔊 Sound Design & Audio Synthesis
- **Feedback sonoro potenziato**: Sintetizzati suoni dedicati per peto-salto, scivolata, combo crescente sui fagioli (il pitch si alza per ogni combo!), distruzione ostacoli in modalità invincibile e schivata perfetta.
- **Autoplay handling & Singleton safety**: Ripristino audio sicuro su qualsiasi gesto utente.

### 🧪 QA & Qualità Codice
- **Suite di Test Estesa (Vitest)**: Aggiunti 8 nuovi test per coprire `MissionManager`, `SaveManager` e `AudioSystem` (totale 13/13 test superati).
- **ESLint & TypeScript Flat Config**: Zero errori di compilazione, zero warning di linting.

## v0.2.0 — Salto Qualitativo ✨ (2 Marzo 2026)

Upgrade completo dell'esperienza visiva e del game feel. Il gioco passa da prototipo funzionale a esperienza **premium e coinvolgente**.

### 🎨 Nuovi Asset Visivi (AI-Generated)
- **Sfondi parallax** — tunnel organico bioluminescente + cellule fluttuanti
- **Stellina invincibilità** — stella dorata a 5 punte con glow (procedurale)
- **Magnete** — ferro di cavallo rosso con punte argento e scintille (procedurale)
- **Acid Trap** — pozza acida verde con bolle e bordo luminoso (procedurale)
- **Texture VFX** — `lane_glow`, `speed_line`, `spark`, `trail_particle`, `menu_particle`

### 🎯 UI/UX Redesign
- **Font Outfit** (Google Fonts) su tutte le scene
- **Gradient backgrounds** animati con particelle fluttuanti
- **Pulsanti premium** con shadow, highlight, scale animation, icone emoji
- **MenuScene** — titolo con glow, missione con progress bar, stats bar
- **SelectionScene** — food card glassmorphism con hover animation
- **GameOverScene** — contatori animati, particelle oro per nuovo record, medaglie
- **ShopScene** — card premium con level dots ●○, sezioni SKIN/POTENZIAMENTI
- **LeaderboardScene** — medaglie 🥇🥈🥉, righe con bordi colorati top 3
- **SettingsScene** — toggle switch visuale al posto del testo

### 🚀 Gameplay VFX
- **Corsie luminose** — linee glow animate con scrolling parallax
- **Player glow trail** — scia verde dietro il personaggio
- **Spark burst** — esplosione dorata alla raccolta coin/powerup
- **Speed lines** — linee diagonali ad alta velocità
- **HUD premium** — barra arrotondata semi-trasparente con font Outfit
- **Stage transitions** — flash viola + zoom text
- **Score popup** — testo `+punti` con animazione fade-up
- **Challenge UI** — missioni con emoji 🫘 🦘 💨

### 🛠️ Fix & Polish
- **Palette colori** aggiornata: viola/oro/verde premium
- **Text overflow** corretto in mission card, shop cards, leaderboard rows
- **Asset broken** sostituiti con texture procedurali (stellina, magnete, acid trap)
- **Loading bar** premium con titolo, percentuale e gradiente

### 🧪 Verifiche
- TypeScript: zero errori compilazione
- Unit test: 5/5 passed (SaveManager)
- Visual: verificato in browser (menu, shop, gameplay, game over)
