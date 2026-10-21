# Registro degli asset

## Nuovi, creati per questa versione

`public/art/*.svg`: grafica vettoriale originale scritta nel progetto, senza immagini stock, marchi esterni o download. Include hero, sette pose, quattro ambienti organici, cristallo, pozza, barriera, fagiolo, cipolla e peperoncino. La texture animata è assemblata a runtime da queste pose.

`src/game/ui/Theme.ts` e nuove schermate: interfaccia originale della versione Deep Gut.

## Ereditati dalla base

`public/generated/particle_puff.png`: particella di fumo. Gli altri file nella directory generated sono conservati come materiale storico della copia e non sono caricati dal nuovo gameplay.

`src/game/systems/AudioSystem.ts`: sintesi Web Audio già presente nel gioco originale. Nessun brano musicale esterno aggiunto.

`LICENSE`: licenza MIT originale conservata. Phaser e le altre dipendenze mantengono le rispettive licenze nei loro pacchetti.

## Font

Stack di sistema Trebuchet MS / sans-serif. Nessun caricamento di Google Fonts e nessun font incorporato.
