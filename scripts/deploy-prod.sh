#!/usr/bin/env bash
# Met en ligne la version de production du site (nginx, code minifié) : vérification des types,
# construction de l'image, redémarrage du conteneur, contrôle de santé.
# Usage (dans WSL, depuis n'importe où) : bash frontend/scripts/deploy-prod.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ Vérification TypeScript"
node_modules/.bin/tsc -p tsconfig.app.json --noEmit

echo "→ Construction et démarrage"
docker compose up --build -d

for _ in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/ || true)
  [ "$code" = 200 ] && { echo "✓ Site en ligne (port 3001)"; exit 0; }
  sleep 2
done
echo "✗ Le site ne répond pas : docker compose logs fidni-frontend" >&2
exit 1
