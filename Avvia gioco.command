#!/bin/zsh
cd -- "${0:A:h}"
if ! command -v npm >/dev/null 2>&1; then
  print 'Serve Node.js con npm per avviare il gioco.'
  read '?Premi Invio per chiudere.'
  exit 1
fi
if [[ ! -d node_modules ]]; then
  npm ci || exit 1
fi
npm run dev -- --host 127.0.0.1 --open
